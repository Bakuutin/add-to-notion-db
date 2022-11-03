type Rule = {
    tag: string
    rule: string | RegExp | ((text: string, isURL: boolean) => boolean)
}