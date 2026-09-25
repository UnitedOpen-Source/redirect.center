# Guia de uso

## Criar um redirecionamento

1. Abra `/redirects/new` (**Criar redirecionamento**).
2. Informe a origem sem protocolo ou caminho, por exemplo `go.example.com`.
3. Informe a URL completa de destino, por exemplo `https://example.org/launch`.
4. Escolha o status. O gerador começa com **302** para facilitar testes;
   configurações DNS sem modificador continuam usando **301**.
5. Opcionalmente, mantenha caminho/query da origem e acrescente UTMs.
6. Gere e copie os registros. A geração não altera seu DNS.
7. Adicione os registros no provedor DNS e aguarde a propagação.

A prévia é local: não consulta nem verifica a URL de destino. Ao editar o
formulário, a configuração anterior é invalidada para evitar copiar valores
desatualizados. Trocar o idioma preserva os campos e o resultado.

## Domínio raiz → www

Na zona `my-domain.com`, usando os valores da instalação pública informados no
projeto:

| Nome         | Tipo  | Valor                               |
| ------------ | ----- | ----------------------------------- |
| `@` ou vazio | A     | `54.84.55.102`                      |
| `redirect`   | CNAME | `www.my-domain.com.redirect.center` |

Confira o IP e o domínio do serviço com o operador antes de configurar produção.
No ambiente local, os valores são `127.0.0.1` e `localhost`, exclusivos para
testes.

Para HTTPS **no destino**, use `www.my-domain.com.opts-https.redirect.center`. O
status padrão do servidor é 301.

## Subdomínio

É possível apontar diretamente:

```dns
www  CNAME  example.org.opts-https.redirect.center.
```

O gerador usa uma estratégia uniforme para raiz e subdomínio. Para
`go.example.com`, na zona `example.com`:

```dns
go           A       <ENTRY_IP>
redirect.go  CNAME   <CNAME gerado>
```

O resultado na tela mostra nomes completos. Alguns provedores acrescentam a zona
automaticamente e exigem nomes relativos. Evite registros A, AAAA e CNAME em
conflito; use o modo DNS sem proxy. Um proxy de TLS exige configuração própria.

## Referência completa

| Parâmetro                 | Função                                                           | Exemplo de CNAME                                  |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `.opts-https`             | HTTPS no destino                                                 | `example.com.opts-https.redirect.center`          |
| `.opts-uri`               | Repassa caminho e query originais                                | `example.com.opts-uri.redirect.center`            |
| `.opts-slash.{path}`      | Acrescenta um caminho                                            | `example.com.opts-slash.blog.redirect.center`     |
| `.opts-path-{base32}`     | Caminho em Base32, preservando maiúsculas e caracteres especiais | `example.com.opts-path-mfrgg.redirect.center`     |
| `.opts-query-{base32}`    | Query em Base32                                                  | `example.com.opts-query-nfxgg.redirect.center`    |
| `.opts-statuscode-{code}` | 301, 302, 307 ou 308                                             | `example.com.opts-statuscode-302.redirect.center` |
| `.opts-port-{port}`       | Porta de destino                                                 | `example.com.opts-port-8080.redirect.center`      |

Para acrescentar vários segmentos sem caracteres especiais, repita
`.opts-slash.{segmento}`. Por exemplo, a resposta na
[issue #66](https://github.com/udleinati/redirect.center/issues/66) usa
`www.twitch.tv.opts-slash.videos.opts-slash.1558730390.opts-https.redirect.center.`
para o caminho `/videos/1558730390`.

O gerador valida o máximo de 63 caracteres por rótulo e 253 no nome DNS
completo, sem o ponto final. Caminhos são codificados em partes; cada parâmetro
de query ocupa um rótulo. URLs longas podem não caber: encurte os valores.
Fragmentos `#`, credenciais, protocolos diferentes de HTTP/HTTPS e loops diretos
são rejeitados.

Com `.opts-uri`, o servidor acrescenta o caminho recebido ao caminho configurado
e a query recebida à query configurada. Chaves repetidas recebidas na origem não
são deduplicadas pelo servidor.

## UTMs

Os cinco campos são `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e
`utm_term`. Eles são anexados ao destino e codificados no CNAME. Um campo
preenchido substitui a mesma chave que já existia na URL informada; os outros
parâmetros são mantidos.

Exemplo curto para teste:

```text
Origem: go.example.com
Destino: https://example.org
utm_source: ig
utm_medium: bio
utm_campaign: launch
```

A URL final será
`https://example.org/?utm_source=ig&utm_medium=bio&utm_campaign=launch`.
Atribuição de campanha depende de uma ferramenta de analytics instalada **no
destino**. Desvio não instala Google Analytics nem coleta valores UTM dos
visitantes.

## Analytics por redirecionamento

Cada **domínio de origem** identifica um redirecionamento. `go.example.com` e
`shop.example.com` têm contadores independentes, mesmo quando apontam para o
mesmo destino.

Em `/analytics`, informe o domínio e clique em **Consultar acessos**.
Configurações geradas ficam salvas neste navegador e aparecem como atalhos em
**Seus redirecionamentos**. A lista usa `localStorage`, não é sincronizada entre
dispositivos e não comprova que o DNS foi ativado. O link **Ver acessos deste
redirecionamento** abre o painel da configuração gerada.

- Respostas HTTP entregues para o domínio de origem selecionado.
- Gráfico dos últimos sete dias, agrupados em UTC.
- Totais de permanentes (301/308) e temporários (302/307).
- Persistência em Deno KV, no arquivo `.data/analytics.sqlite`.
- `GET /api/analytics?domain=go.example.com` retorna apenas esse
  redirecionamento. Sem domínio válido, retorna HTTP 400.
- O banco armazena domínio de origem e contadores diários; não armazena IP, URL
  completa, cookie, identidade ou campanha individual.
- Não há rastreamento de visitas à interface nem de uso do formulário.

**Os contadores são públicos para quem conhece o domínio consultado.** Não há
autenticação nem listagem pública dos domínios armazenados. A lista da interface
contém somente configurações salvas pelo próprio navegador. Contagens não
comprovam a propriedade do domínio.

Os números não são visitantes únicos nem acessos confirmados no destino. Bots
são incluídos; redirecionamentos servidos pelo cache do navegador/proxy não
chegam ao servidor. Bloqueios e erros não entram no total. Gravações são
assíncronas: uma queda abrupta pode perder gravações pendentes. Cada instância
mantém seu próprio banco.

O histórico pertence ao domínio de origem. Alterar o destino mantém o histórico
da mesma origem. Domínios e subdomínios distintos permanecem separados. Não há
divisão adicional por caminho, pois a regra do serviço é definida por DNS.

Logs operacionais do servidor podem conter IP, caminho e User-Agent. Esses logs
são independentes do banco de analytics.

## HTTPS

O parâmetro `.opts-https` configura o destino. O servidor Deno recebe HTTP.
HTTPS na origem exige um proxy com certificado válido para o domínio de origem.
Registros DNS sozinhos não fornecem TLS.

## Idiomas e conteúdo preservado

A interface oferece **PT / EN / ES**, detecta o idioma do navegador e guarda a
preferência em `localStorage` (sem cookie). Campos, mensagens, documentação na
interface e analytics são traduzidos. URLs e registros DNS não são traduzidos.

As descrições originais em inglês, português, espanhol, alemão, francês,
italiano, japonês, russo, coreano, chinês, árabe e hindi continuam disponíveis
em **Como funciona → Desvio around the world** e em
[LEGACY-CONTENT.md](LEGACY-CONTENT.md).

Links preservados: [GitHub](https://github.com/udleinati/redirect.center),
[Issues](https://github.com/udleinati/redirect.center/issues),
[contato](mailto:udlei@nati.biz), [linkpci](https://linkpci.com/) e
[streamrocks](https://streamrocks.com/).

## Denunciar uma URL maliciosa

Abra **Denunciar URL** ou acesse `/report`. Informe a URL completa, selecione
phishing, malware, fraude ou outro motivo e acrescente detalhes opcionais. O
formulário está disponível em PT, EN e ES.

O envio recebe um protocolo e fica com status `pending`, aguardando revisão pelo
operador. A denúncia não bloqueia automaticamente a URL e o servidor não visita
o endereço informado. Evite dados pessoais ou credenciais nos detalhes.

Há um limite de cinco denúncias por hora por endereço de conexão ao servidor.
URLs têm limite de 2.048 caracteres e detalhes de 2.000. O protocolo confirma
apenas o recebimento, não a conclusão da análise.
