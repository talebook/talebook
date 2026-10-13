package httpapi

import (
	"database/sql"
	"fmt"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginruntime"
	"talebook/booksvr/internal/userdb"
)

// annotationPushCapability 是批注扇出使用的插件能力名。
const annotationPushCapability = "annotations.push"

// pluginAnnotationSyncer 复刻 Python AnnotationSyncService：
// 把公开批注扇出到已安装的 annotations.push 插件。
type pluginAnnotationSyncer struct {
	db       *sql.DB
	settings map[string]any
	registry *pluginruntime.PluginRegistry
}

// NewAnnotationSyncer 返回一个把批注扇出到插件的同步器。
func NewAnnotationSyncer(db *sql.DB, settings map[string]any,
	registry *pluginruntime.PluginRegistry) AnnotationSyncer {
	if registry == nil {
		registry = pluginruntime.NewPluginRegistry()
	}
	return &pluginAnnotationSyncer{db: db, settings: settings, registry: registry}
}

// SyncAnnotation 复刻 sync_annotation：跳过私密批注，逐个来源写入并记录状态。
func (s *pluginAnnotationSyncer) SyncAnnotation(annotationID int64, excludeSourceName, excludeConnectionID string) {
	annotation, err := userdb.GetAnnotationByID(s.db, annotationID)
	if err != nil || annotation == nil || annotation.IsPrivate {
		return
	}

	providers, err := s.pushProviders()
	if err != nil || len(providers) == 0 {
		return
	}

	data := annotation.ToAPI(nil)
	for _, p := range providers {
		name := providerName(p.provider)
		if name == excludeSourceName {
			continue
		}
		s.syncOne(annotation, data, name, p.push)
	}
}

// annotationPushProvider 把一个 provider 的清单与推送能力配对。
type annotationPushProvider struct {
	provider pluginiface.Provider
	push     pluginiface.AnnotationProvider
}

// pushProviders 返回已启用的 annotations.push provider。
func (s *pluginAnnotationSyncer) pushProviders() ([]annotationPushProvider, error) {
	rt := pluginruntime.NewRuntime(s.db, s.settings, s.registry)
	raw, err := rt.EnabledProviders(annotationPushCapability)
	if err != nil {
		return nil, err
	}
	out := make([]annotationPushProvider, 0, len(raw))
	for _, p := range raw {
		if ap, ok := p.(pluginiface.AnnotationProvider); ok {
			out = append(out, annotationPushProvider{provider: p, push: ap})
		}
	}
	return out, nil
}

// syncOne 把一条批注推送到单个 provider，并更新来源同步状态。
func (s *pluginAnnotationSyncer) syncOne(annotation *userdb.Annotation, data map[string]any,
	name string, p pluginiface.AnnotationProvider) {
	source, err := userdb.FindAnnotationSource(s.db, annotation.ReaderID, annotation.BookID,
		name, "", fmt.Sprintf("%d", annotation.ID))
	if err != nil {
		return
	}
	if source == nil {
		source = &userdb.AnnotationSource{
			AnnotationID: annotation.ID,
			SourceName:   name,
		}
		if err := userdb.CreateAnnotationSource(s.db, source); err != nil {
			return
		}
	}

	// 标记为 pending。
	_ = userdb.UpdateAnnotationSource(s.db, source.ID, userdb.AnnotationSourceUpdate{
		SyncStatus: "pending",
	})

	item := plugindomain.Annotation{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"id":        annotation.ID,
		"book_id":   annotation.BookID,
		"reader_id": annotation.ReaderID,
		"quote":     annotation.QuoteText,
		"content":   annotation.Content,
		"chapter":   annotation.Chapter,
		"cfi":       annotation.CFI,
	})}
	state := plugindomain.SourceState{DomainRecord: plugindomain.NewDomainRecord(map[string]any{
		"source_name": name,
	})}

	receipt, err := p.PushAnnotation(item, state, map[string]any{"annotation": data})
	if err != nil {
		_ = userdb.UpdateAnnotationSource(s.db, source.ID, userdb.AnnotationSourceUpdate{
			SyncStatus: "failed",
		})
		return
	}

	runID := receipt.SourceAnnotationID
	position := receipt.SourcePosition
	rawHash := receipt.SourceRawHash
	updatedAt := receipt.SourceUpdatedAt
	_ = userdb.UpdateAnnotationSource(s.db, source.ID, userdb.AnnotationSourceUpdate{
		RunID:      &runID,
		Position:   &position,
		RawHash:    &rawHash,
		UpdatedAt:  &updatedAt,
		SyncStatus: "synced",
		SyncedAt:   time.Now().Format("2006-01-02 15:04:05"),
	})
}

// providerName 从 provider 清单里取插件名。
func providerName(p pluginiface.Provider) string {
	m := p.Manifest()
	for _, key := range []string{"name", "key", "plugin_key", "id"} {
		if v, ok := m[key]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}
