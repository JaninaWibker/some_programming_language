let _global = {
  keywords: {
    'if': 'if',
    'else': ':',
    'lambda_t': 'lambda',
    'lambda_s': 'λ',
    'true': 'true',
    'false': 'false'
  }, chars: {
    bracket_open: '(',
    bracket_close: ')',
    bracket_c_open: '{',
    bracket_c_close: '}',
    bracket_s_open: '[',
    bracket_s_close: ']',
    equals: '=',
    plus_equals: '+=',
    minus_equals: '-=',
    mult_equals: '*=',
    div_equals: '/=',
    mod_equals: '%=',
    bit_and_equals: '&=',
    bit_xor_equals: '^=',
    bit_or_equals: '|=',
    plus: '+',
    minus: '-',
    mult: '*',
    div: '/',
    mod: '%',
    bit_and: '&',
    bit_xor: '^',
    bit_or: '|',
    comment: '#',
    comma: ',',
    semicolon: ';',
  }, _AST: {
    num: num => ({type: 'num', value: num}),
    str: str => ({type: 'str', value: str}),
    bool: bool => ({type: 'bool', value: bool}),
    punc: punc => ({type: 'punc', value: punc}),
    prog: prog => ({type: 'prog', prog: prog}),
    binary: (type, op, left, right) => ({type: type, operator: op, left: left, right: right})
  }, _PRECEDENCE: {
    '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '%=': 1, '&=': 1, '^=': 1, '|=': 1,
    '|': 2, '^': 3, '&': 4,
    '||': 5,
    '&&': 6,
    '<': 7, '>': 7, '<=': 7, '>=': 7, '==': 7, '!=': 7,
    '+': 10, '-': 10,
    '*': 20, '/': 20, '%': 20
  }
}

let InputStream = require('./InputStream')(_global)
let TokenStream = require('./TokenStream')(_global)
let Parser = require('./Parser')(_global)
let Environment = require('./Environment')
let Evaluate = require('./Evaluate')(_global)


let Lambda = (code, show_AST=false) => {

  let AST = Parser(TokenStream(InputStream(code)))

  if(show_AST) {
    console.log(JSON.stringify(AST, 2, 2))
  }

  let env = new Environment()

  env._def({
    print: (a) => { console.log(a);return false },
    println: (a) => { console.log(a + '\n');return false },
    num: (a) => parseFloat(a),
    str: (a) => String(a),
    obj: (...args) => {
      if(args.length % 2 !== 0)
        return false
      let l_obj = {}
      for(let i=0;i < args.length;i+=2) {
        l_obj[args[i]] = args[i+1]
      }
      return (task, key, value) => {
        if(typeof task !== 'undefined' && typeof key !== 'undefined') {
          if(task === 'get') { return l_obj[key] }
          if(task === 'set' && typeof value !== 'undefined') { l_obj[obj] = value; return }
        }
        console.log('[Warning]: obj() must have task, key and if task is "set" a value')
        return false
      }
    },
    arr: (...args) => {
      let l_arr = args
      return (task, key, value) => {
        if(typeof task !== 'undefined' && typeof key !== 'undefined') {
          if(task === 'get') { return l_arr[key] }
          if(task === 'set' && typeof value !== 'undefined') { l_arr[obj] = value; return false }
          if(task === 'push') { l_arr.push(key); return false }
        }
        console.log('[Warning]: arr() must have task, key and if task is "set" a value')
      }
    },
    math_E: 2.718281828459045,
    math_PI: 3.141592653589793,
    math_abs: (a) => a >= 0 ? a : -a,
    math_floor: (a) => a|0,
    math_ceil: (a) => a !== (a|0) ? (a + 1)|0 : a,
    math_round: (a) => (a+0.5)|0,
    string_length: (a) => a.length,
    str_len: (a) => a.length,
    string_cut: (a, b, c) => a.substring(a, b ? b : 0, c ? c : a.length),
    str_cut: (a, b, c) => a.substring(a, b ? b : 0, c ? c : a.length),
    string_contains: (a, b) => a.indexOf(b) >= 0,
    str_cont: (a, b) => a.indexOf(b) >= 0,
    string_indexOf: (a, b) => a.indexOf(b),
    str_iof: (a, b) => a.indexOf(b),
  })

  return Evaluate(AST, env)
}

module.exports = Lambda
