declare module 'mustache' {
  export function render(template: string, view: any, partials?: any, config?: any): string;
  export default {
    render: render,
  };
}



