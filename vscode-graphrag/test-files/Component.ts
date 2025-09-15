// 测试依赖文件
export interface Component {
  id: string;
  render(): string;
}

export class ButtonComponent implements Component {
  id: string = 'button';
  
  render(): string {
    return '<button>Click me</button>';
  }
}
