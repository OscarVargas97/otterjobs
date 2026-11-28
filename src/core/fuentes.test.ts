import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buscarRepos, guardarNota, estadoFuentes, resumenRepo, sinCredenciales } from './fuentes.ts'

test('fuentes: la URL del remoto pierde usuario y token', () => {
  assert.equal(sinCredenciales('https://ana:tok123@gitlab.ejemplo.com/g/r.git\n'), 'https://gitlab.ejemplo.com/g/r.git')
  assert.equal(sinCredenciales('git@github.com:ana/r.git'), 'git@github.com:ana/r.git')
})

test('fuentes: el resumen de un repo cuenta solo los commits de la persona', async () => {
  const raiz = mkdtempSync(join(tmpdir(), 'otterjobs-git-'))
  const repo = join(raiz, 'proyecto')
  mkdirSync(repo)
  const git = (...a: string[]) => execFileSync('git', ['-C', repo, ...a])
  git('init', '-q')
  git('remote', 'add', 'origin', 'https://ana:secreto@ejemplo.com/ana/proyecto.git')
  for (const [quien, archivo] of [['ana@ejemplo.com', 'app.ts'], ['otro@ejemplo.com', 'otro.py'], ['Ana@Ejemplo.com', 'estilo.css']]) {
    writeFileSync(join(repo, archivo), 'a\nb\n')
    git('add', '.')
    git('-c', `user.name=x`, '-c', `user.email=${quien}`, 'commit', '-q', '-m', `agrega ${archivo}`)
  }
  assert.deepEqual(buscarRepos(raiz), [repo])
  const md = (await resumenRepo(repo, ['ana@ejemplo.com']))!
  assert.match(md, /Tus commits: 2,/)
  assert.match(md, /agrega estilo\.css/)
  assert.doesNotMatch(md, /otro\.py|secreto/)
  assert.equal(await resumenRepo(repo, ['nadie@ejemplo.com']), null)
})

test('fuentes: una nota pegada queda en fuentes/notas y aparece en el estado', () => {
  const d = mkdtempSync(join(tmpdir(), 'otterjobs-fuentes-'))
  guardarNota(d, 'Perfil en otro portal', 'Texto pegado')
  assert.deepEqual(estadoFuentes(d).notas, ['fuentes/notas/perfil-en-otro-portal.md'])
  assert.throws(() => guardarNota(d, '', 'x'))
})
