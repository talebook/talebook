package httpapi

// ImplementedPatterns 返回 Go 侧已实现路由的 pattern 集合。
//
// 用途：与 LegacyRoutes() 求差集，得到尚未移植的 legacy 路由清单。
// 这里只统计「已有 Go handler」的路由，不含仅存在于 routes.go 镜像表中的条目。
func ImplementedPatterns() []string {
	specs := []RouteSpec{}
	specs = append(specs, WorkRouteSpecs()...)
	specs = append(specs, AuthRouteSpecs(AuthConfig{})...)
	specs = append(specs, ThemeRouteSpecs(nil)...)
	specs = append(specs, AdminOpdsSourcesRouteSpecs()...)
	specs = append(specs, AnnotationRouteSpecs(nil)...)
	specs = append(specs, ComicRouteSpecs(ComicConfig{}, nil)...)
	specs = append(specs, OnlineComicRouteSpecs(OnlineComicConfig{})...)
	specs = append(specs, PluginRouteSpecs(PluginConfig{})...)
	specs = append(specs, BookToolsRouteSpecs(BookToolsConfig{})...)
	specs = append(specs, BookSourceAdminRouteSpecs(BookSourceAdminConfig{})...)
	specs = append(specs, NetworkRouteSpecs(NetworkConfig{})...)
	specs = append(specs, CaptchaRouteSpecs(CaptchaConfig{})...)
	specs = append(specs, ImportRouteSpecs(ImportConfig{})...)
	specs = append(specs, ScanRouteSpecs(ScanConfig{})...)
	specs = append(specs, FilesRouteSpecs(FilesConfig{})...)
	specs = append(specs, UserRouteSpecs(UserConfig{})...)
	specs = append(specs, MetaRouteSpecs(MetaConfig{})...)
	specs = append(specs, UpgradeRouteSpecs(UpgradeConfig{})...)
	specs = append(specs, SocialRouteSpecs(SocialConfig{})...)
	specs = append(specs, OpdsRouteSpecs(OpdsConfig{})...)
	specs = append(specs, AdminRouteSpecs(AdminConfig{})...)
	specs = append(specs, AudioRouteSpecs(AudioConfig{})...)
	specs = append(specs, BookRouteSpecs(BookConfig{})...)
	specs = append(specs, WebDAVRouteSpecs(WebDAVConfig{})...)

	seen := map[string]bool{}
	out := make([]string, 0, len(specs))
	for _, s := range specs {
		if s.Pattern == "" || seen[s.Pattern] {
			continue
		}
		seen[s.Pattern] = true
		out = append(out, s.Pattern)
	}
	return out
}
