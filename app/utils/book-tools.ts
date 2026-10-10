export function confirmDestructiveBookWrite(
    isOverwrite: boolean,
    message: string,
    confirmAction: (prompt: string) => boolean = prompt => window.confirm(prompt),
) {
    return !isOverwrite || confirmAction(message);
}

export type BookToolAction = 'preview' | 'run';

/** 所有书籍工具共用按插件 ID 分发的统一接口：/plugins/<plugin_key>/tool[/preview|/run]。 */
export function bookToolUrl(pluginKey: string, action?: BookToolAction) {
    const base = `/plugins/${encodeURIComponent(pluginKey)}/tool`;
    return action ? `${base}/${action}` : base;
}
