
exports.init_cm = function() {
  // Definition du style pour le Z80 Rasm
  CodeMirror.defineMode('z80A', function(_config, parserConfig) {
    let ez80 = parserConfig.ez80;
    let keywords1 = /^(exx?|(ld|cp|in)([di]r?)?|pop|push|ad[cd]|cpl|daa|dec|inc|neg|sbc|sub|and|bit|[cs]cf|x?or|res|set|r[lr]c?a?|r[lr]d|s[lr]a|srl|djnz|nop|rst|[de]i|halt|im|ot[di]r|out[di]?)\b/i;
    let keywords2 = /^(d[bwsm]|def[bwsm]|equ|buildsna|include|incbin|run|macro|mend|repeat|rend|call|j[pr]|ret[in]?)\b/i;
    //keywords2

    let variables1 = /^(af?|bc?|c|de?|e|hl?|l|i[xy]?|i[xy]l|r|sp)\b/i;
    let variables2 = /^(n?[zc]|p[oe]?|m)\b/i;
    let errors = /^([hl][xy]|i[xy][hl]|slia|sll)\b/i;
    let numbers = /^([\da-f]+h|[0-7]+o|[01]+b|\d+d?)\b/i;

    return {
      startState: function() {
        return {
          context: 0
        };
      },
      token: function(stream, state) {
        if (!stream.column())
          state.context = 0;

        if (stream.eatSpace())
          return null;

        let w;

        if (stream.eatWhile(/\w/)) {
          if (ez80 && stream.eat('.')) {
            stream.eatWhile(/\w/);
          }
          w = stream.current();

          if (stream.indentation()) {
            if ((state.context == 1 || state.context == 4) && variables1.test(w)) {
              state.context = 4;
              return 'var2';
            }

            if (state.context == 2 && variables2.test(w)) {
              state.context = 4;
              return 'var3';
            }

            if (keywords1.test(w)) {
              state.context = 1;
              return 'keyword';
            } else if (keywords2.test(w)) {
              state.context = 2;
              return 'keyword';
            } else if (state.context == 4 && numbers.test(w)) {
              return 'number';
            }

            if (errors.test(w))
              return 'error';
          } else if (stream.match(numbers)) {
            return 'number';
          } else {
            return null;
          }
        } else if (stream.eat(';')) {
          stream.skipToEnd();
          return 'comment';
        } else if (stream.eat('"')) {
          while (w = stream.next()) {
            if (w == '"')
              break;

            if (w == '\\')
              stream.next();
          }
          return 'string';
        } else if (stream.eat('\'')) {
          if (stream.match(/\\?.'/))
            return 'number';
        } else if (stream.eat('.') || stream.sol() && stream.eat('#')) {
          state.context = 5;

          if (stream.eatWhile(/\w/))
            return 'def';
        } else if (stream.eat('$')) {
          if (stream.eatWhile(/[\da-f]/i))
            return 'number';
        } else if (stream.eat('#')) {
          if (stream.eatWhile(/[\da-f]/i))
            return 'number';
        } else if (stream.eat('%')) {
          if (stream.eatWhile(/[01]/))
            return 'number';
        } else {
          stream.next();
        }
        return null;
      }
    };
  });

  CodeMirror.defineMIME("text/x-z80A", "z80A");
  //  cm.defineMIME("text/x-ez80", { name: "z80", ez80: true });
}
