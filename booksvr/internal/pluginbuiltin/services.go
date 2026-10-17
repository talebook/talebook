package pluginbuiltin

import (
	"talebook/booksvr/internal/metasource"
	"talebook/booksvr/internal/pluginruntime"
)

// BindCalibre attaches the existing Calibre runtime to this registry only.
// Separate registries used by tests and embedded servers retain their own services.
func BindCalibre(registry *pluginruntime.PluginRegistry, identifier metasource.CalibreIdentifier) {
	provider, err := registry.Get("talebook.meta.calibre")
	if err == nil {
		if calibre, ok := provider.(*calibreMetaProvider); ok {
			calibre.Source.API.Identifier = identifier
		}
	}
}
