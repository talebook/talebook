export function confirmDestructiveBookWrite(
    isOverwrite: boolean,
    message: string,
    confirmAction: (prompt: string) => boolean = prompt => window.confirm(prompt),
) {
    return !isOverwrite || confirmAction(message);
}
