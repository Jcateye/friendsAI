declare module 'mustache' {
  export function render(template: string, view: any, partials?: any, config?: any): string;
  export function parse(template: string, tags?: string[]): unknown[];
  export default {
    render: render,
    parse: parse,
  };
}
