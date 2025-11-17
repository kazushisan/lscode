import { add, multiply, PI } from './math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, PI);
}

calculate();
