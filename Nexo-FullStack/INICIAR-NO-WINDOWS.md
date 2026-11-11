# Abrir o Nexo no VS Code

1. Instale Node.js 24 ou superior.
2. Extraia este ZIP em uma pasta comum, por exemplo `C:\Projetos\nexo`.
3. No VS Code, use Arquivo > Abrir Pasta e selecione a pasta com `package.json`.
4. Abra Terminal > Novo Terminal.
5. Execute um comando por vez:

```powershell
npm ci
npm run setup
npm run dev
```

Abra `http://localhost:5173` ou o endereço indicado no terminal e clique em **Explorar demo**.

Nas próximas vezes, rode apenas `npm run dev`.

Se o PowerShell bloquear `npm.ps1` por política de execução, use `npm.cmd` no lugar de `npm` ou selecione o terminal Prompt de Comando do VS Code. Não é necessário alterar a política de segurança do Windows.

Não abra `index.html` nem use Live Server: o projeto agora tem API e banco. O código fica distribuído em `app`, `features`, `components`, `server`, `shared`, `db` e `tests`.

Para verificar:

```powershell
npm run typecheck
npm test
npm run build
```

Leia `README.md` para os detalhes de funcionamento e limites.
