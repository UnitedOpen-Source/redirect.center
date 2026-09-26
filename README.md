# Desvio

**Redirecione um domínio com DNS, sem manter uma aplicação para cada link.** O
Desvio é uma interface e extensão do
[redirect.center original](https://github.com/udleinati/redirect.center),
mantida neste [fork](https://github.com/UnitedOpen-Source/redirect.center): ela
lê o CNAME configurado no seu provedor DNS e responde com um redirecionamento
HTTP. O nome da interface é independente do domínio técnico `FQDN`: mudar a
marca não exige trocar registros DNS já publicados.

A interface gera os registros DNS, acrescenta parâmetros UTM, mostra os acessos
**por domínio de origem** e permite denunciar URLs maliciosas. É gratuita, open
source e pode ser usada sem criar uma conta.

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![Backers on Open Collective](https://opencollective.com/redirectcenter/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/redirectcenter/sponsors/badge.svg)](#sponsors)

## Como funciona

1. O proprietário do domínio configura um registro **A** para o IP do serviço e
   um **CNAME** com o destino codificado no nome DNS. Um subdomínio também pode
   apontar diretamente para o CNAME gerado.
2. Quando um visitante acessa a origem, o serviço lê o CNAME e responde com HTTP
   301, 302, 307 ou 308.
3. O visitante chega ao destino. O gerador e o painel são ferramentas de
   configuração; o redirecionamento não depende de JavaScript.

Exemplo para redirecionar `my-domain.com` para `https://www.my-domain.com` na
instalação `redirect.center`:

| Nome na zona `my-domain.com` | Tipo  | Valor                                           |
| ---------------------------- | ----- | ----------------------------------------------- |
| `@` ou vazio                 | A     | `54.84.55.102`                                  |
| `redirect`                   | CNAME | `www.my-domain.com.opts-https.redirect.center.` |

Confirme `ENTRY_IP` e `FQDN` com a instância que você pretende usar. Os valores
locais (`127.0.0.1` e `localhost`) servem apenas para testes. O gerador mostra
os registros corretos para a configuração da instância.

**HTTPS no destino** é definido por `.opts-https`. Para receber **HTTPS na
origem**, use um proxy com certificado válido para o seu domínio; DNS não emite
certificados.

## Rotas

As páginas e APIs ficam apenas no host definido em `FQDN`. Outros hosts sempre
seguem o fluxo de redirecionamento, mesmo quando o caminho é `/docs` ou
`/api/analytics`.

| Caminho                   | Função                                   |
| ------------------------- | ---------------------------------------- |
| `/`                       | Visão geral                              |
| `/redirects/new`          | Gerador de CNAME e UTM                   |
| `/analytics`              | Acessos por domínio de origem            |
| `/docs`                   | Guia e referência DNS                    |
| `/report`                 | Denúncia de URL suspeita                 |
| `/api/analytics?domain=…` | Contadores públicos da origem consultada |
| `POST /api/reports`       | Recebimento de denúncias para revisão    |
| `/healthz`                | Estado do processo                       |

Links antigos como `/#builder` são encaminhados no navegador para a nova rota.

## O que a interface oferece

- **Gerador de CNAME:** URL de destino, status HTTP, caminho e query da origem e
  campos `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e `utm_term`.
  Valida os limites de tamanho do DNS antes de copiar.
- **Analytics por redirecionamento:** contadores diários para o domínio de
  origem selecionado, com separação entre respostas permanentes e temporárias.
  Os dados ficam em Deno KV; são públicos para quem conhece o domínio e
  representam respostas do servidor, não visitantes únicos.
- **Denúncias:** `/report` recebe URLs suspeitas e gera um protocolo. O operador
  revisa os envios; não há bloqueio automático.
- **Idiomas:** interface em português, inglês e espanhol; descrições históricas
  do projeto preservadas em 12 idiomas.

Os registros gerados ficam salvos somente neste navegador para facilitar
consultas. Gerar um registro não altera seu DNS.

## Rodar localmente

Requer [Deno 2](https://deno.com/). Na raiz do repositório:

```sh
git clone https://github.com/UnitedOpen-Source/redirect.center.git
cd redirect.center
deno task dev
```

Abra [http://localhost:3000](http://localhost:3000). A primeira execução baixa
as dependências e cria `.data/analytics.sqlite`. Para usar outra porta, defina
`LISTEN_PORT` antes do comando.

```sh
deno task test    # suíte completa, incluindo testes que consultam DNS
deno task start   # inicia sem observar arquivos
deno task reports # lista denúncias para revisão local pelo operador
```

## Configuração e publicação

| Variável       | Padrão      | Uso                                            |
| -------------- | ----------- | ---------------------------------------------- |
| `FQDN`         | `localhost` | Domínio técnico do serviço e sufixo dos CNAMEs |
| `ENTRY_IP`     | `127.0.0.1` | IPv4 indicado nos registros A                  |
| `LISTEN_PORT`  | `3000`      | Porta HTTP                                     |
| `LISTEN_IP`    | `0.0.0.0`   | Endereço de escuta                             |
| `PROJECT_NAME` | `Desvio`    | Nome exibido na interface                      |
| `ENVIRONMENT`  | `dev1`      | Nome do ambiente                               |
| `LOGGER_LEVEL` | `debug`     | Nível de log                                   |

Para uma instalação pública, configure `FQDN`, `ENTRY_IP`, DNS do serviço, TLS
quando necessário e escrita persistente em `.data`. Há exemplos de Docker e
systemd em [Desenvolvimento e publicação](docs/DEVELOPMENT.md). O serviço não
altera DNS externo automaticamente.

## Documentação

- [Guia de uso, DNS, UTMs e analytics](docs/USAGE.md)
- [Desenvolvimento, API de denúncias e publicação](docs/DEVELOPMENT.md)
- [Visão geral da documentação](docs/README.md)
- [Textos originais nos 12 idiomas](docs/LEGACY-CONTENT.md)
- [Revisão das issues e PRs do projeto original](docs/HISTORY-REVIEW.md)

---

## Contributors

This project exists thanks to all the people who contribute.
[[Contribute](CONTRIBUTING.md)].

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->

| [<img src="https://avatars0.githubusercontent.com/u/302277?v=4" width="100px;"/><br /><sub><b>Udlei Nati</b></sub>](https://github.com/udleinati)<br />[💻](https://github.com/udleinati/redirect.center/commits?author=udleinati "Code") [📖](https://github.com/udleinati/redirect.center/commits?author=udleinati "Documentation") [🤔](#ideas-udleinati "Ideas, Planning, & Feedback") [🚇](#infra-udleinati "Infrastructure (Hosting, Build-Tools, etc)") |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Backers

Thank you to all our backers! 🙏
[[Become a backer](https://opencollective.com/redirectcenter#backer)]

<a href="https://opencollective.com/redirectcenter#backers" target="_blank"><img src="https://opencollective.com/redirectcenter/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a
link to your website.
[[Become a sponsor](https://opencollective.com/redirectcenter#sponsor)]

<a href="https://opencollective.com/redirectcenter/sponsor/0/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/1/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/2/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/3/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/4/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/5/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/6/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/7/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/8/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/9/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/9/avatar.svg"></a>
