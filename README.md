# Meu Zine

Editor no navegador pra montar um **zine de 8 páginas numa folha única** (o
clássico "dobra e corta uma folha A4") e, no verso dessa mesma folha, um
**pôster** separado — sem precisar de nenhuma ferramenta de design, só
arrastar fotos, escrever frases e colar formas tipo colagem/fanzine.

Sem build, sem framework: é HTML + CSS + JS puro, abre direto no navegador.

## Funcionalidades

- **8 blocos de página** (capa, pág. 2 a 7, contracapa) já na ordem de
  leitura certa — a posição física de cada um na folha impressa (metade de
  cabeça pra baixo, como a dobra exige) é calculada automaticamente.
- **Pôster no verso**: um bloco único do tamanho da folha inteira, editado
  separado da zine, pra quando a folha é aberta por completo.
- Em cada bloco dá pra:
  - arrastar/soltar fotos (ou clicar pra escolher do dispositivo);
  - adicionar frases de texto com 5 fontes, cor e tamanho ajustáveis;
  - adicionar formas de colagem (fita adesiva, papel rasgado, selo,
    meio-tom, estrela, rabisco, seta);
  - mover, redimensionar e girar qualquer item (foto, texto ou forma).
- **Exportação**:
  - PNG da zine (frente) e PNG do pôster (verso), separados;
  - PDF único com as duas páginas (frente = zine, verso = pôster), gerado
    direto no navegador via [jsPDF](https://github.com/parallax/jsPDF) — sem
    depender do `window.print()` do navegador, que é instável pra isso.
- Estado salvo automaticamente no navegador (IndexedDB) — fecha a aba e
  continua de onde parou.

## Como usar

Abra o `index.html` direto no navegador, ou sirva a pasta com qualquer
servidor estático (recomendado, pra fontes/scripts externos carregarem sem
restrição de `file://`):

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

### Imprimindo

1. Clique em **"Baixar PDF (frente + verso)"** — baixa um PDF de 2 páginas.
2. Abra esse PDF no leitor do computador (Preview, Adobe Reader — não vale a
   pena imprimir direto do navegador).
3. Mande imprimir com a opção **"frente e verso"** (duplex) ligada, borda
   zero / sem escala.
4. Dobre e corte seguindo as linhas-guia pontilhadas que saem na página 1.

## No celular

- **Dá pra montar os blocos da zine (frente) pelo celular**: os painéis são
  responsivos, empilham um por linha, e arrastar foto do rolo de fotos ou
  tirar com a câmera funciona pelo seletor de arquivo nativo. Mover, girar e
  redimensionar os itens também funciona por toque.
- **O editor do pôster (verso) também funciona no celular**: o bloco
  encolhe pra caber na largura da tela (até um máximo de 880px em telas
  grandes), sem forçar rolagem horizontal da página. A ideia é dar pra
  montar o rascunho pelo celular com conforto — o que importa de verdade
  (posição, tamanho, texto) é guardado em porcentagem/proporção, então a
  exportação final em PDF/PNG sai sempre na resolução cheia (300dpi),
  independente do tamanho da tela usada pra editar.
- Exportar PNG/PDF funciona em navegador mobile (é tudo `<canvas>` +
  `jsPDF` rodando no próprio aparelho), mas aparelhos mais fracos podem
  demorar mais pra gerar as imagens em alta resolução, e o Safari no iOS às
  vezes abre o PDF numa aba em vez de baixar direto — nesse caso é só usar o
  "Compartilhar" pra salvar.

## Stack

- HTML / CSS / JavaScript puro (sem framework, sem build step)
- [jsPDF](https://github.com/parallax/jsPDF) (via CDN) pra exportação de PDF
- `Canvas 2D API` pra compor as imagens de impressão em 300dpi
- `IndexedDB` pra persistir o estado no navegador
- Google Fonts: Special Elite, Permanent Marker, Caveat, Bebas Neue, Courier
  Prime

## Estrutura

```
index.html   estrutura da página
style.css    visual (tema "zine alternativo")
app.js       toda a lógica: editor, drag/resize, export PNG/PDF
```
