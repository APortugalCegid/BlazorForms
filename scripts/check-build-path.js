// Verifica que o build corre a partir do path canónico NTFS.
// Em Windows, C:\apps e C:\Apps são o mesmo directório mas o Node.js/webpack
// trata-os como distintos, causando dual React instance e erros de prerender.
const cwd = process.cwd();

if (
  process.platform === "win32" &&
  /[Cc]:\\[Aa]pps/i.test(cwd) &&
  !cwd.includes("Apps")
) {
  console.error("\n ERRO DE BUILD");
  console.error(" O build deve correr de C:\\Apps\\blazor-tracker (A maiúsculo).");
  console.error(" Path actual: " + cwd);
  console.error(" Solução: usa build.ps1 ou cd para o path correcto.\n");
  process.exit(1);
}
