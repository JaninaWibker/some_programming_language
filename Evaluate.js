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

module.exports = (scope) => Evaluate.bind(scope)
