import { ImportDeclaration } from '@babel/types';

export default function (opts) {
  return {
    visitor: {
      ImportDeclaration({ node }: { node: ImportDeclaration }, state) {
        console.log('node =>', node);
      },
    },
  };
}
