let Lambda = require('./index.js')

// Lambda(`
// sum = λ(a, b) {
//   a + b;
// };
// print(sum(1, 2));
// `)
//
// Lambda(`
// x = 1;
// if x == 1 print(x) : print(x+1)
// `)

// console.log(Lambda(`
// y = math_PI;
// print(5);
// y
// `))
//
// Lambda(`
// array = λ(a,b,c) {
//   λ(n, _) {
//     _ = "";
//     if n == 0 { _ = a };
//     if n == 1 { _ = b };
//     if n == 2 { _ = c };
//     _
//   };
// };
// x = array("a", "b", "c");
// print(x(0));
// `)
//
// Lambda(`
// x = obj("a", 1);
// (λ() {
//   print(x("get", "a"));
// })();
// arr()
// `)

console.log(Lambda(`
20 / (5 * 3)
`))
