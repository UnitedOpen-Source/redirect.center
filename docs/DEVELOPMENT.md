# Desenvolvimento e operação

## Rodar localmente

Requer Deno 2 com suporte a KV. Na raiz do repositório:

```sh
deno task dev
```

Abra **http://localhost:3000**. `localhost` é importante: o host configurado em
`FQDN` recebe a interface; outros hosts seguem o fluxo de redirecionamento. O
processo observa mudanças em `src`, `views` e `public`. A primeira execução
baixa as dependências e cria `.data/analytics.sqlite`.

```sh
deno task start       # sem observação de arquivos
deno task test        # testes, incluindo benchmarks que usam DNS/rede
deno check --unstable-kv src/main.ts
```

Testes determinísticos das novas funcionalidades:

```sh
deno test --unstable-kv --allow-read --allow-env src/services/builder_test.ts src/services/analytics_test.ts
```

## Configuração

| Variável       | Padrão      | Uso                                   |
| -------------- | ----------- | ------------------------------------- |
| `PROJECT_NAME` | `Desvio`    | Marca exibida                         |
| `FQDN`         | `localhost` | Host da interface e sufixo dos CNAMEs |
| `ENTRY_IP`     | `127.0.0.1` | IPv4 dos registros A                  |
| `LISTEN_PORT`  | `3000`      | Porta HTTP                            |
| `LISTEN_IP`    | `0.0.0.0`   | Interface de rede                     |
| `ENVIRONMENT`  | `dev1`      | Nome do ambiente                      |
| `LOGGER_LEVEL` | `debug`     | Nível do logger                       |
| `RSS_LIMIT_MB` | `384`       | Limite do watchdog de memória         |

Não use o FQDN/IP local em registros DNS públicos. Não é necessário mudar
`FQDN=redirect.center` para adotar a marca Desvio.

## Estrutura

- `views/index.vto`: interface e documentação renderizadas por Vento.
- `public/style.css`: layout responsivo, ilustração vetorial em CSS e estilos.
- `public/app.js`: navegação, formulário, cópia e analytics.
- `public/builder.js`: geração de CNAME e validação DNS, sem dependências
  externas.
- `public/i18n.js`: traduções PT/EN/ES, detecção e persistência de idioma.
- `src/services/redirect.ts`: parser compatível com os modificadores existentes.
- `src/services/analytics.ts`: incrementos atômicos e consulta dos sete dias em
  UTC.
- `src/main.ts`: interface em cache, assets, analytics e redirecionamentos.

O site usa Google Fonts para tipografia, com fontes locais de fallback. O
formulário funciona sem esse recurso externo. Não há script externo de
analytics. Deno KV exige `--unstable-kv`; o processo precisa ler e escrever
`.data`.

## Idiomas

O português no template é o texto-fonte. `public/i18n.js` mapeia cada texto para
inglês e espanhol. Adicione novas strings ao dicionário e use `t()` para
mensagens dinâmicas. Blocos de código, DNS e o conteúdo histórico marcado
`data-no-translate` não são alterados. O atributo `lang`, os placeholders, os
rótulos acessíveis e o título acompanham o idioma selecionado.

## API de analytics

`GET /api/analytics?domain=go.example.com`, apenas no host do serviço, retorna:

```json
{
  "days": [
    { "date": "2026-09-19", "redirect": 4, "status_301": 1, "status_302": 3 }
  ],
  "timezone": "UTC",
  "scope": "redirect",
  "source": "go.example.com",
  "updatedAt": "2026-09-19T12:00:00.000Z"
}
```

A resposta real sempre contém sete dias. Chaves ausentes significam zero. A
resposta usa `Cache-Control: no-store`. O endpoint exige `domain` e retorna
somente os contadores dessa origem. Os números são públicos para quem conhece o
domínio; não há autenticação nem listagem pública de domínios. Não existe API
pública para alterar os contadores. Os contadores históricos permanecem no
banco; a consulta mostra sete dias.

## Publicar

Configure o domínio/IP reais, o wildcard DNS do serviço e, quando necessário,
TLS em um proxy. Nunca conte com `.opts-https` para emitir certificados de
origem.

Para systemd, veja `redirect-center.service`. Crie `.data` no diretório do
projeto, com permissão de escrita para o usuário do serviço. A unidade usa
`--unstable-kv --allow-write=.data`. Confirme o caminho do binário Deno e do
repositório antes de instalar.

Para Docker:

```sh
docker build -t desvio .
docker run --rm -p 3000:3000 -v desvio-data:/app/.data -e FQDN=localhost desvio
```

Use um volume persistente para `.data`. Em produção, configure `FQDN` e
`ENTRY_IP`. Para backup consistente, pare o serviço antes de copiar o diretório
completo `.data`, incluindo arquivos auxiliares SQLite. Remover o volume elimina
os contadores. Múltiplas réplicas não compartilham estatísticas automaticamente.

As alterações desta versão não fazem deploy nem modificam DNS externo.

## Rota de denúncias

- `GET /report`: formulário público, apenas no FQDN do serviço.
- `POST /api/reports`: recebe JSON e registra a denúncia para revisão.
- Nenhuma rota HTTP permite listar ou consultar o conteúdo das denúncias.

```sh
curl -i http://localhost:3000/api/reports \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://example.com/suspicious","reason":"phishing","details":"Descrição do problema"}'
```

Exemplo de resposta HTTP 201:

```json
{
  "id": "protocolo-uuid",
  "status": "pending",
  "createdAt": "2026-09-19T12:00:00.000Z"
}
```

Motivos: `phishing`, `malware`, `fraud`, `other`. Campos: `url` obrigatório,
`reason` obrigatório, `details` opcional. O limite do corpo é 8 KiB, mesmo sem
`Content-Length`. A URL deve usar HTTP/HTTPS e não conter credenciais. O
servidor apenas valida e armazena; nunca abre a URL denunciada.

Erros: HTTP 400 para campos inválidos, 413 para corpo grande, 415 para tipo
diferente de JSON, 429 para excesso de envios (com `Retry-After`). A cota é
cinco envios por hora por IP da conexão TCP, identificada por hash no banco e
expirada em uma hora. Cabeçalhos `X-Forwarded-For` não são usados para a cota;
atrás de um proxy, clientes podem compartilhar esse limite. Configure proteção
por cliente no proxy conforme a instalação.

Denúncias ficam no mesmo KV, em `['report', id]`, com URL, motivo, detalhes,
status e data; sem expiração automática. A consulta é local ao operador:

```sh
deno task reports
```

O comando imprime JSON, uma denúncia por linha. Revise os envios antes de
qualquer ação manual no Guardian (`db/guardian.json`). Nenhum bloqueio, aviso
externo ou envio de e-mail é automático. Restrinja o acesso ao arquivo KV e aos
backups, pois os detalhes são conteúdo fornecido pelo denunciante.
