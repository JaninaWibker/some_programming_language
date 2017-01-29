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
      let his_prec = _global._PRECEDENCE[tok.value]
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


module.exports = (scope) => Parser.bind(scope)
