export function confirmDestructiveBookWrite(
    isOverwrite: boolean,
    message: string,
    confirmAction: (prompt: string) => boolean = prompt => window.confirm(prompt),
) {
    return !isOverwrite || confirmAction(message);
}

export type BookToolAction = 'describe' | 'preview' | 'run';

/** 插件能力的统一调用入口：POST /plugins/<plugin_key>/exec/<action>。 */
export function pluginExecUrl(pluginKey: string, action: string) {
    return `/plugins/${encodeURIComponent(pluginKey)}/exec/${encodeURIComponent(action)}`;
}

/** 书籍工具的三个平台动作：tool.describe、tool.preview、tool.run，均为 POST。 */
export function bookToolUrl(pluginKey: string, action: BookToolAction) {
    return pluginExecUrl(pluginKey, `tool.${action}`);
}
