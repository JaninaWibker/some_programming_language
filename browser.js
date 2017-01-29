let Lambda = (() => {
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

  class Environment {
    constructor(parent) {
      this.vars = Object.create(parent ? parent.vars : null)
      this.parent = parent
    }
    extend() {
      return new Environment(this)
    }

    lookup(name) {
      let scope = this
      while(scope) {
        if(Object.hasOwnProperty.call(scope.vars, name))
          return scope
        scope = scope.parent
      }
    }

    get(name) {
      if(name in this.vars) // cannot use Object.keys; does not seem to work for some reason idk
        return this.vars[name]
      throw new Error('undefined variable ' + name)
    }

    set(name, value) {
      let scope = this.lookup(name)
      if(!scope && this.parent)
        throw new Error('undefined variable ' + name)
      return (scope || this).vars[name] = value
    }
    def(name, value) {
      this.vars[name] = value
    }
    _def(obj) {
      Object.keys(obj).forEach((item) => {
        this.vars[item] = obj[item]
      })
    }
  }

  let InputStream = ((scope) => {
    let InputStream = function(input) {
      let pos  = 0
      let line = 1
      let col  = 0

      let next = () => {
        let ch = input.charAt(pos++)
        if (ch == '\n') {
          line++
          col = 0
        } else {
          col++
        }
        return ch
      }

      let peek = () => input.charAt(pos)

      let eof = () => peek() === ''

      let croak = (msg) => {
        throw new Error(`${msg} (${line}:${col})`)
      }

      return {
        next:  next,
        peek:  peek,
        eof:   eof,
        croak: croak
      }
    }
    return InputStream.bind(scope)
  })(_global)
  let TokenStream = ((scope) => {
    let TokenStream = function(input) {
      let _global = this
      let current = null

      Object.values = (obj) => Object.keys(obj).map(item => obj[item])

      let is = {
        keyword: (x) => Object.values(_global.keywords).indexOf(x) >= 0,
        digit: (ch) => /[0-9]/i.test(ch),
        id_start: (ch) => /[a-zλ_:]/i.test(ch),
        id: (ch) => is.id_start(ch) || '?!-<>=0123456789'.indexOf(ch) >= 0,
        op_char: (ch) => '^+-*/%=&|<>!'.indexOf(ch) >= 0,
        punc: (ch) => ',;(){}[]'.indexOf(ch) >= 0,
        whitespace: (ch) => ' \t\n'.indexOf(ch) >= 0,
      }

      let read = {
        number: () => {
          let has_dot = false
          let number = read_while((ch) => {
            if(ch == '.') {
              if(has_dot) return false
              return has_dot = true
            }
            return is.digit(ch)
          })
          return _global._AST.num(parseFloat(number)) //{ type: "num", value: parseFloat(number) }
        },
        ident: () => {
          let id = read_while(is.id)
          if(!is.keyword(id) && id.indexOf(_global.keywords.else) >= 0)
            input.croak('cannot use \'' + _global.keywords.else + '\' as variable name')
          return {
            type: is.keyword(id) ? 'kw' : 'var',
            value: id
          }
        },
        escaped: (end) => {
          let escaped = false
          let str = ''
          input.next()
          while(!input.eof()) {
            let ch = input.next()
            if(escaped) {
              str += ch
              escaped = false
            } else if(ch === '\\') {
              escaped = true
            } else if(ch === end) {
              break;
            } else {
              str += ch
            }
          }
          return str
        },
        string: () => _global._AST.str(read.escaped('"')) //({ type: 'str', value: read.escaped('"') }),
      }

      let skip_comment = () => {
        read_while((ch) => ch !== '\n')
        input.next()
      }

      let read_while = (predicate, str='') =>
        !input.eof() && predicate(input.peek())
          ? read_while(predicate, str + input.next())
          : str

      let read_next = () => {
        read_while(is.whitespace)
        if(input.eof()) return null
        let ch = input.peek()
        if(ch === _global.chars.comment) {
          skip_comment()
          return read_next()
        }
        if(ch === '"') return read.string()
        if(is.digit(ch)) return read.number()
        if(is.id_start(ch)) return read.ident()
        if(is.punc(ch)) return _global._AST.punc(input.next())
        if(is.op_char(ch)) return {
          type: 'op',
          value: read_while(is.op_char)
        }
        input.croak('can\'t handle character: ' + ch)
      }


      let peek = () => current || (current = read_next())

      let next = () => {
        let tok = current
        current = null
        return tok || read_next()
      }

      let eof = () => peek() === null

      return {
        next:  next,
        peek:  peek,
        eof:   eof,
        croak: input.croak
      }
    }
    return TokenStream.bind(scope)
  })(_global)
  let Parser = ((scope) => {
    let Parser = function(input) {
      let _global = this

      let is = {
        punc: ch => {
          let tok = input.peek()
          return tok && tok.type === 'punc' && (!ch || tok.value === ch) && tok
        },
        kw: kw => {
          let tok = input.peek()
          return tok && tok.type === 'kw' && (!kw || tok.value === kw) && tok
        },
        op: op => {
          let tok = input.peek()
          return tok && tok.type === 'op' && (!op || tok.value === op) && tok
        }
      }

      let skip = {
        punc: ch => {
          if(is.punc(ch)) input.next()
          else input.croak('Expected punctuation: "' + ch + '"')
        },
        kw: kw => {
          if(is.kw(kw)) input.next()
          else input.croak('Expected keyword: "' + kw + '"')
        },
        op: op => {
          if(is.op(op)) input.next()
          else input.croak('Expected operator: "' + op + '"')
        }
      }

      // unexpected
      // working
      let unexpected = () => {
        input.croak('Unexpected token: ' + JSON.stringify(input.peek()))
      }

      // parse_[x]
      // working
      let parse_toplevel = () => {
        let prog = []
        while(!input.eof()) {
          prog.push(parse_expression())
          if(!input.eof()) skip.punc(_global.chars.semicolon)
        }
        return _global._AST.prog(prog)
      }
      // not tested
      let parse_atom = () => {
        return maybe_call(() => {
          if(is.punc(_global.chars.bracket_open)) {
            input.next()
            let exp = parse_expression()
            skip.punc(_global.chars.bracket_close)
            return exp
          }
          if(is.punc(_global.chars.bracket_c_open)) return parse_prog()
          if(is.kw(_global.keywords.if)) return parse_if()
          if(is.kw(_global.keywords.true) || is.kw(_global.keywords.false)) return parse_bool()
          if(is.kw(_global.keywords.lambda_t) || is.kw(_global.keywords.lambda_s)) {
            input.next()
            return parse_lambda()
          }
          let tok = input.next()
          if(tok.type === 'var' || tok.type === 'num' || tok.type === 'str') return tok
          unexpected()
        })}
      // working
      let parse_prog = () => {
        let prog = delimited(_global.chars.bracket_c_open, _global.chars.bracket_c_close, _global.chars.semicolon, parse_expression)
        if(prog.length == 0) return _global.bool(false)
        if(prog.length == 1) return prog[0]
        return _global._AST.prog(prog)
      }
      // working
      let parse_lambda = () => ({
        type: 'lambda',
        vars: delimited(_global.chars.bracket_open, _global.chars.bracket_close, _global.chars.comma, parse_varname),
        body: parse_expression()
      })
      // working
      let parse_varname = () => {
        let name = input.next()
        if(name.type !== 'var') input.croak('Expecting variable name')
        return name.value
      }
      // not tested (bit different because of missing then)
      let parse_if = () => {
        skip.kw(_global.keywords.if)
        let cond = parse_expression()
        let then = parse_expression()
        let ret = { type: 'if', cond: cond, then: then }
        if(is.kw(_global.keywords.else)) {
          input.next()
          ret.else = parse_expression()
        }
        return ret
      }
      // working
      let parse_expression = () => {
        return maybe_call(() => {
          return maybe_binary(parse_atom(), 0)
        })}
      // working
      let parse_call = (func) => ({
        type: 'call',
        func: func,
        args: delimited(_global.chars.bracket_open, _global.chars.bracket_close, _global.chars.comma, parse_expression)
      })
      // working
      let parse_bool = () => _global._AST.bool(input.next().value === "true")
      // not tested
      let delimited = (start, stop, separator, parser) => {
        let a = []
        let first = true
        skip.punc(start)
        while(!input.eof()) {
          if(is.punc(stop)) break;
          if(first) {
            first = false
          } else {
            skip.punc(separator)
          }
          if(is.punc(stop)) break;
          a.push(parser())
        }
        skip.punc(stop)
        return a
      }
      // working
      let maybe_call = (expr) => {
        expr = expr()
        return is.punc(_global.chars.bracket_open) ? parse_call(expr) : expr
      }
      // not tested
      let maybe_binary = (left, my_prec) => {
        let tok = is.op()
        if(tok) {
          let his_prec= _global._PRECEDENCE[tok.value]
          if(his_prec > my_prec) {
            input.next()
            let right = maybe_binary(parse_atom(), his_prec)
            let binary
            switch (tok.value) {
              case _global.chars.equals: binary = _global._AST.binary('assign', _global.chars.equals, left, right); break;
              case _global.chars.plus_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.plus, left, right)); break;
              case _global.chars.minus_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.minus, left, right)); break;
              case _global.chars.mult_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.mult, left, right)); break;
              case _global.chars.div_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.div, left, right)); break;
              case _global.chars.mod_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.mod, left, right)); break;
              case _global.chars.bit_and_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.bit_and, left, right)); break;
              case _global.chars.bit_xor_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.bit_xor, left, right)); break;
              case _global.chars.bit_or_equals: binary = _global._AST.binary('assign', _global.chars.equals, left, _global._AST.binary('binary', _global.chars.bit_or, left, right)); break;
              default: binary = _global._AST.binary('binary', tok.value, left, right)
            }
            return  maybe_binary(binary, my_prec)
          }
        }
        return left
      }

      return parse_toplevel()
    }
    return Parser.bind(scope)
  })(_global)
  let Evaluate = ((scope) => {
    function Evaluate(exp, env) {
      let _global = this
      let evaluate = (exp, env) => {
        switch (exp.type) {
          case 'num':
          case 'str':
          case 'bool':
            return exp.value
          case 'var':
            return env.get(exp.value)
          case 'assign':
            if(exp.left.type !== 'var')
              throw new Error('Cannot assign to ' + JSON.stringify(exp.left))
            return env.set(exp.left.value, evaluate(exp.right, env))
          case 'binary':
            return apply_op(exp.operator,
                            evaluate(exp.left, env),
                            evaluate(exp.right, env))
          case 'lambda':
            return make_lambda(exp, env)
          case 'if':
            return evaluate(exp.cond, env) !== false ?
              evaluate(exp.then, env) :
              exp.else ? evaluate(exp.else, env) : false
          case 'prog':
            let val = false
            exp.prog.forEach((exp) => {
              val = evaluate(exp, env)
            })
            return val
          case 'call':
            let _rtn = evaluate(exp.func, env).apply(null, exp.args.map((arg) => evaluate(arg, env)))
            return _rtn === undefined ? false : _rtn
          default:
            throw new Error('cannot evaluate: ' + exp.type)
        }
      }

      let apply_op = (op, a, b) => {
        let num = (x) => {
          if (typeof x !== 'number')
            throw new Error('Expected number; got ' + x)
          return x
        }
        let div = (x) => {
          if(num(x) === 0) {
            console.log('[Warning]: Dividing by 0')
          }
          return num(x)
        }
        switch(op) {
          case _global.chars.plus: return num(a) + num(b)
          case _global.chars.minus: return num(a) - num(b)
          case _global.chars.mult: return num(a) * num(b)
          case _global.chars.div: return num(a) / div(b)
          case _global.chars.mod: return num(a) % div(b)
          case '&&': return a !== false && b
          case '||': return a !== false ? a : b
          case '<': return num(a) < num(b)
          case '>': return num(a) > num(b)
          case '<=': return num(a) <= num(b)
          case '>=': return num(a) >= num(b)
          case '==': return a === b
          case '!=': return a !== b
          case _global.chars.bit_and: return num(a) & num(b)
          case _global.chars.bit_xor: return num(a) ^ num(b)
          case _global.chars.bit_or: return num(a) | num(b)

        }
        throw new Error('Can\'t apply operator ' + op)
      }

      let make_lambda = (exp, env) => {
        function lambda() {
          let names = exp.vars
          let scope = env.extend()
          for(let i=0;i<names.length;i++) {
            scope.def(names[i], i < arguments.length ? arguments[i] : false)
          }
          scope.def('this', (i, k) => k ? exp.vars[i] : arguments[i])
          return evaluate(exp.body, scope)
        }
        return lambda
      }
      return evaluate(exp, env)
    }
    return Evaluate.bind(scope)
  })(_global)

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
  return Lambda
})()

console.log(Lambda(`
20 / (5 * 3)
`));
