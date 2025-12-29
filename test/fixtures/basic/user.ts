export class User {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

export type ID = string | number;

export const user: User = new User('John', 30);

export const userId: ID = '123';
