// Al abrir Claude Code con este plugin, le pasa el método como contexto, con la CLI de esta instalación de otterjobs.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const aqui = import.meta.dirname
const raiz = dirname(aqui).replace(/\\/g, '/')
process.stdout.write(readFileSync(join(aqui, 'metodo.md'), 'utf8').replace('{{CLI}}', `pnpm -s --dir ${raiz} otterjobs`))
