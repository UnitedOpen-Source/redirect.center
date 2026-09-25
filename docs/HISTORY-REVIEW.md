# Revisão do histórico do redirect.center

Revisão em 25 de setembro de 2026 das **35 issues** (abertas e fechadas) e dos
**30 pull requests** (abertos, fechados e mesclados) de
[`udleinati/redirect.center`](https://github.com/udleinati/redirect.center).
Esta página registra decisões para o fork Desvio. Os links levam ao histórico
original; o código e as novas propostas deste fork ficam em
[`UnitedOpen-Source/redirect.center`](https://github.com/UnitedOpen-Source/redirect.center).

## Caminhos, barras e caracteres especiais

O parser já entende barras repetidas e Base32 para caminho/query. Documentar a
sintaxe de #66; manter as restrições do gerador sobre fragmentos até haver
compatibilidade comprovada. Não reabrir todos os pedidos fechados.

Discussões revisadas: Issues
[#3](https://github.com/udleinati/redirect.center/issues/3),
[#4](https://github.com/udleinati/redirect.center/issues/4),
[#6](https://github.com/udleinati/redirect.center/issues/6),
[#11](https://github.com/udleinati/redirect.center/issues/11),
[#14](https://github.com/udleinati/redirect.center/issues/14),
[#16](https://github.com/udleinati/redirect.center/issues/16),
[#19](https://github.com/udleinati/redirect.center/issues/19),
[#20](https://github.com/udleinati/redirect.center/issues/20),
[#21](https://github.com/udleinati/redirect.center/issues/21),
[#22](https://github.com/udleinati/redirect.center/issues/22),
[#28](https://github.com/udleinati/redirect.center/issues/28),
[#34](https://github.com/udleinati/redirect.center/issues/34),
[#43](https://github.com/udleinati/redirect.center/issues/43),
[#46](https://github.com/udleinati/redirect.center/issues/46),
[#66](https://github.com/udleinati/redirect.center/issues/66); PRs
[#5](https://github.com/udleinati/redirect.center/pull/5),
[#37](https://github.com/udleinati/redirect.center/pull/37),
[#40](https://github.com/udleinati/redirect.center/pull/40),
[#42](https://github.com/udleinati/redirect.center/pull/42).

## HTTPS e disponibilidade

Distinguir HTTPS **do destino** (`opts-https`) de TLS **na origem**
(certificado/proxy). Não prometer HTTPS de origem só com DNS.

Discussões revisadas: Issues
[#12](https://github.com/udleinati/redirect.center/issues/12),
[#26](https://github.com/udleinati/redirect.center/issues/26),
[#27](https://github.com/udleinati/redirect.center/issues/27),
[#35](https://github.com/udleinati/redirect.center/issues/35),
[#44](https://github.com/udleinati/redirect.center/issues/44),
[#48](https://github.com/udleinati/redirect.center/issues/48),
[#50](https://github.com/udleinati/redirect.center/issues/50).

## DNS, configuração e hospedagem

Documentar registros raiz/subdomínio, hosts e Docker. Alternativa TXT e IPv6
foram discutidas, mas não fazem parte do contrato atual; Docker publish já tem
PR aberto.

Discussões revisadas: Issues
[#9](https://github.com/udleinati/redirect.center/issues/9),
[#13](https://github.com/udleinati/redirect.center/issues/13),
[#23](https://github.com/udleinati/redirect.center/issues/23),
[#24](https://github.com/udleinati/redirect.center/issues/24),
[#41](https://github.com/udleinati/redirect.center/issues/41),
[#45](https://github.com/udleinati/redirect.center/issues/45),
[#47](https://github.com/udleinati/redirect.center/issues/47),
[#49](https://github.com/udleinati/redirect.center/issues/49),
[#51](https://github.com/udleinati/redirect.center/issues/51),
[#55](https://github.com/udleinati/redirect.center/issues/55),
[#60](https://github.com/udleinati/redirect.center/issues/60); PRs
[#36](https://github.com/udleinati/redirect.center/pull/36),
[#54](https://github.com/udleinati/redirect.center/pull/54),
[#56](https://github.com/udleinati/redirect.center/pull/56).

## Conversor, status e porta

O conversor no navegador atende o uso interativo. Portas e status já são
aceitos. Uma API de conversão exigiria justificativa nova, pois #33 foi
encerrada com o conversor JS.

Discussões revisadas: Issues
[#33](https://github.com/udleinati/redirect.center/issues/33),
[#39](https://github.com/udleinati/redirect.center/issues/39); PRs
[#38](https://github.com/udleinati/redirect.center/pull/38),
[#10](https://github.com/udleinati/redirect.center/pull/10).

## Código, manutenção e documentação

Preservar crédito, conteúdo multilíngue e compatibilidade do parser. O
Deno/Hono/Vento atual vem da migração #67.

Discussões revisadas: PRs
[#1](https://github.com/udleinati/redirect.center/pull/1),
[#2](https://github.com/udleinati/redirect.center/pull/2),
[#7](https://github.com/udleinati/redirect.center/pull/7),
[#8](https://github.com/udleinati/redirect.center/pull/8),
[#15](https://github.com/udleinati/redirect.center/pull/15),
[#17](https://github.com/udleinati/redirect.center/pull/17),
[#18](https://github.com/udleinati/redirect.center/pull/18),
[#25](https://github.com/udleinati/redirect.center/pull/25),
[#29](https://github.com/udleinati/redirect.center/pull/29),
[#30](https://github.com/udleinati/redirect.center/pull/30),
[#31](https://github.com/udleinati/redirect.center/pull/31),
[#32](https://github.com/udleinati/redirect.center/pull/32),
[#52](https://github.com/udleinati/redirect.center/pull/52),
[#53](https://github.com/udleinati/redirect.center/pull/53),
[#57](https://github.com/udleinati/redirect.center/pull/57),
[#67](https://github.com/udleinati/redirect.center/pull/67).

## Dependências antigas

Referem-se principalmente à árvore Node anterior à migração #67; verificar
aplicabilidade antes de reproduzir atualizações.

Discussões revisadas: PRs
[#58](https://github.com/udleinati/redirect.center/pull/58),
[#59](https://github.com/udleinati/redirect.center/pull/59),
[#63](https://github.com/udleinati/redirect.center/pull/63),
[#64](https://github.com/udleinati/redirect.center/pull/64),
[#65](https://github.com/udleinati/redirect.center/pull/65).

A única issue aberta no repositório original,
[#66](https://github.com/udleinati/redirect.center/issues/66), pergunta sobre
barras repetidas. A resposta mostra o uso repetido de `opts-slash`; a
documentação do Desvio inclui esse exemplo. Os PRs abertos no original são
[#54](https://github.com/udleinati/redirect.center/pull/54),
[#59](https://github.com/udleinati/redirect.center/pull/59),
[#63](https://github.com/udleinati/redirect.center/pull/63),
[#64](https://github.com/udleinati/redirect.center/pull/64) e
[#65](https://github.com/udleinati/redirect.center/pull/65).

Para este fork, as lacunas pertinentes são **triagem das denúncias recebidas** e
**agregação de analytics em instalações com múltiplas réplicas**. O endpoint de
denúncia registra os envios, mas a revisão ainda depende do CLI local; os
contadores em KV são específicos de cada instância. Esses itens devem ser
tratados nas issues do fork
[#3](https://github.com/UnitedOpen-Source/redirect.center/issues/3) e
[#4](https://github.com/UnitedOpen-Source/redirect.center/issues/4), com
critérios de aceitação próprios.
