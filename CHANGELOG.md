# Semantic Versioning Changelog

## [1.14.1](https://git.sfera.inno.local/SUMD/backend/compare/v1.14.0...v1.14.1) (2025-05-13)


### Bug Fixes

* update logs for SSL connection ([e14ed08](https://git.sfera.inno.local/SUMD/backend/commit/e14ed08405fd3f844a8f3fa5456b747a1d42337e))

# [1.14.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.13.2...v1.14.0) (2025-05-13)


### Bug Fixes

* add env variable for SSL connection ([b30406f](https://git.sfera.inno.local/SUMD/backend/commit/b30406fd6b61d4d8db4512c8068ecb01508a477c))


### Features

* add required SSL connection to DB ([e6dd5da](https://git.sfera.inno.local/SUMD/backend/commit/e6dd5da736531399f6cf744efaf03c184e1fd911))

## [1.13.2](https://git.sfera.inno.local/SUMD/backend/compare/v1.13.1...v1.13.2) (2025-04-15)


### Bug Fixes

* замена неподдерживаемой функции ([05be67c](https://git.sfera.inno.local/SUMD/backend/commit/05be67cc500a1767760eb2e66e619ee40b6614dd))

## [1.13.1](https://git.sfera.inno.local/SUMD/backend/compare/v1.13.0...v1.13.1) (2025-04-10)


### Bug Fixes

* доработка сопоставления параметра ds_department ([6e36a16](https://git.sfera.inno.local/SUMD/backend/commit/6e36a16e6cc93dbae984c2566e86b7465100fe15))

# [1.13.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.12.0...v1.13.0) (2025-03-26)


### Bug Fixes

* fix big with rollback on final status ([1f10850](https://git.sfera.inno.local/SUMD/backend/commit/1f10850108049ffc524dab1d5650be442d1751fa))
* fix bugs in rollback feature ([bfbf318](https://git.sfera.inno.local/SUMD/backend/commit/bfbf3188c95406addb9644b0601a6e696ed2d176))
* fix rollback stages and add logs ([5232513](https://git.sfera.inno.local/SUMD/backend/commit/5232513a9d1736a543ac20b440b19a151a53a761))
* merge conflict with parallel stages final ([bb695b1](https://git.sfera.inno.local/SUMD/backend/commit/bb695b13c0ddd8ed7f79e82b0fc19423b089332f))
* rollback ([64a5e2c](https://git.sfera.inno.local/SUMD/backend/commit/64a5e2ccddbc55aeb50807ed42bd8d3a41e4fdfb))
* rollback ([26e3410](https://git.sfera.inno.local/SUMD/backend/commit/26e34108575ff26106116a6fdf600edec5505203))
* update rollback logic ([16af3e6](https://git.sfera.inno.local/SUMD/backend/commit/16af3e6ea57d525b9dfe12c7c12a28a1e7c65967))
* update rollback logic ([7a2f115](https://git.sfera.inno.local/SUMD/backend/commit/7a2f11595b132bfc6c52c74f53183b6d16018969))
* незакрытая транзакция при удалении этапа модели ([023dfa8](https://git.sfera.inno.local/SUMD/backend/commit/023dfa831330cf3b8329109f547acf3af2eeb89d))
* обработка смены этапа модели в транзакции ([3516fbe](https://git.sfera.inno.local/SUMD/backend/commit/3516fbe310cccd81e50052eb2b06bb6acb6619e2))
* получение тасок из камунды в рамках отката без привязки к группам пользователя ([87f979a](https://git.sfera.inno.local/SUMD/backend/commit/87f979a61dcfe09bcae399dde418fddcef0ad8ee))


### Features

* add suspend ([0ae0b45](https://git.sfera.inno.local/SUMD/backend/commit/0ae0b4582a202f166aeab93e546f18ca621da835))
* add suspend feature ([99a03c7](https://git.sfera.inno.local/SUMD/backend/commit/99a03c78096653f3d8038e4f1ef0ce7f255203f0))
* add suspend feature ([bc54049](https://git.sfera.inno.local/SUMD/backend/commit/bc54049e27b6e80ef5d0e33f93a77ba375105fe2))
* add suspend feature ([d22bbbb](https://git.sfera.inno.local/SUMD/backend/commit/d22bbbb90ec51be5399a2c733db9db8164ea138c))
* add suspend feature ([2e2389c](https://git.sfera.inno.local/SUMD/backend/commit/2e2389cdbb3f1ae7b684f80473646738371e0168))
* установка этапа из user task ([7dad742](https://git.sfera.inno.local/SUMD/backend/commit/7dad7428437efd1af49c3f007f29653ca8c444ff))

# [1.12.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.11.0...v1.12.0) (2025-03-14)


### Bug Fixes

* enable editing previous quarter in previous year ([ef5904f](https://git.sfera.inno.local/SUMD/backend/commit/ef5904fd2e0afbde3d38edc9dd7075aef7162cf2))
* метод смены статуса NLP API ([424b78f](https://git.sfera.inno.local/SUMD/backend/commit/424b78fc6297c0d846af1ffd7824e18cd04ccc2c))
* отображение статуса в карточке модели ([de96054](https://git.sfera.inno.local/SUMD/backend/commit/de960542c89218b1847127296b973671196279eb))


### Features

* Сохранение подразделения БЗ или владельца модели ([d6e9e43](https://git.sfera.inno.local/SUMD/backend/commit/d6e9e43e69d0fbb0bc97c8cca3e805d071ce6214))

# [1.11.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.10.0...v1.11.0) (2025-02-28)


### Bug Fixes

* исправление новых этапов и статусов ([febaf48](https://git.sfera.inno.local/SUMD/backend/commit/febaf484806e73ecabefe8cbf1b48933a81536b9))


### Features

* artefact model desc ([34462a0](https://git.sfera.inno.local/SUMD/backend/commit/34462a0cf4821e388fde21c12259a0f6173abe32))

# [1.10.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.9.2...v1.10.0) (2025-02-27)


### Features

* Доработка отчётов СУМ для новых статусов ([fe10a64](https://git.sfera.inno.local/SUMD/backend/commit/fe10a64a63a57970cd4d40191e1df01f449a4e06))
* новые статусы и этапы ЖЦ в карточке и реестре моделей ([654d392](https://git.sfera.inno.local/SUMD/backend/commit/654d392654b9bf9d9ea9c83c22485fe4841caf7c))

## [1.9.2](https://git.sfera.inno.local/SUMD/backend/compare/v1.9.1...v1.9.2) (2025-02-21)


### Bug Fixes

* создание модели от родительской ([3a168e3](https://git.sfera.inno.local/SUMD/backend/commit/3a168e397b9525ba402f3917bed500b7434db889))

## [1.9.1](https://git.sfera.inno.local/SUMD/backend/compare/v1.9.0...v1.9.1) (2025-02-12)


### Bug Fixes

* update business customer customer department mapping ([3246108](https://git.sfera.inno.local/SUMD/backend/commit/3246108447b552a2f1bb0e6728f159a7ae39913b))

# [1.9.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.8.2...v1.9.0) (2025-02-07)


### Features

* **helm:** rm secret yaml ([3f20000](https://git.sfera.inno.local/SUMD/backend/commit/3f2000008a031aad9aca89b7df87712882913f74))

## [1.8.2](https://git.sfera.inno.local/SUMD/backend/compare/v1.8.1...v1.8.2) (2025-02-07)

## [1.8.1](https://git.sfera.inno.local/SUMD/backend/compare/v1.8.0...v1.8.1) (2025-02-04)


### Bug Fixes

* исправление создания новой модели ([19870c5](https://git.sfera.inno.local/SUMD/backend/commit/19870c53c0880e69ad9dfb576012968fe4879c25))

# [1.8.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.7.0...v1.8.0) (2025-02-03)


### Features

* api сум для nlp платформы ([6c0a209](https://git.sfera.inno.local/SUMD/backend/commit/6c0a2099d450619a54aeba4bbd089985f7cdf3d4))
* mapping departments ([d29c0e3](https://git.sfera.inno.local/SUMD/backend/commit/d29c0e31f052a2735aad3801eeda6816627fc47c))
* report departments mapping ([1c31dcd](https://git.sfera.inno.local/SUMD/backend/commit/1c31dcd8349da6dce8d266a71d353d56e54988bf))

# [1.7.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.6.0...v1.7.0) (2024-12-12)


### Bug Fixes

* этапы ЖЦ модели в bpmnStart и bpmnFinish ([20ffd13](https://git.sfera.inno.local/SUMD/backend/commit/20ffd13e983fe734a5f11d4208b8effa5ce9eb0d))


### Features

* mapping departments ([c8da1bc](https://git.sfera.inno.local/SUMD/backend/commit/c8da1bc9d2f205dc7c8f7ed3e820d55c3dddf288))
* mapping departments ([bbbfd1c](https://git.sfera.inno.local/SUMD/backend/commit/bbbfd1c54463e5131e60b7d3cad4face7edf3f0f))
* mapping departments ([6a671d4](https://git.sfera.inno.local/SUMD/backend/commit/6a671d4388c1888058e7c4f8881dc2d238d217eb))
* mapping departments ([9db5688](https://git.sfera.inno.local/SUMD/backend/commit/9db568841c926fe89b9ab7292c1178bd809693a6))
* mapping departments ([2774986](https://git.sfera.inno.local/SUMD/backend/commit/2774986b46cdfa0c72219aaf956b2eb764966c61))
* mapping departments ([229350c](https://git.sfera.inno.local/SUMD/backend/commit/229350cadb4ec76df795efd57bb23191cac67884))
* mapping departments ([39ac871](https://git.sfera.inno.local/SUMD/backend/commit/39ac8713320c862bc142bd74162f4c609f43fd80))
* mapping departments ([4a53c3e](https://git.sfera.inno.local/SUMD/backend/commit/4a53c3ed4c74433f1f724aab891f3be3429bc38f))
* mapping departments ([b2e1d79](https://git.sfera.inno.local/SUMD/backend/commit/b2e1d79560cdbca178acc5d2b763c3f172686523))
* mapping departments ([1acfa11](https://git.sfera.inno.local/SUMD/backend/commit/1acfa11dbcf2def9e666acf75b0ea55790ebf0fd))
* mapping departments ([c47cc9e](https://git.sfera.inno.local/SUMD/backend/commit/c47cc9ea7d7d6f6c563872d706ca101389f7162f))
* mapping departments ([a01a641](https://git.sfera.inno.local/SUMD/backend/commit/a01a6411cc9f4a3d5fcb4bf0998088d9f46c7d54))

# [1.6.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.5.0...v1.6.0) (2024-12-10)


### Features

* доработка получения статуса, и промежуточных статусов из external task ([eefa8ce](https://git.sfera.inno.local/SUMD/backend/commit/eefa8ce26d6cf87457b0caed6b54ccf1b235a5d8))

## [1.5.1](https://git.sfera.inno.local/SUMD/backend/compare/v1.5.0...v1.5.1) (2024-12-09)

# [1.5.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.4.0...v1.5.0) (2024-12-09)


### Features

* determine lifecycle stages ([0530544](https://git.sfera.inno.local/SUMD/backend/commit/0530544fdf90eba95cd9864e196377880f89b089))
* determine lifecycle stages ([505c98d](https://git.sfera.inno.local/SUMD/backend/commit/505c98d9f55509a5507e0d8b40ca2d6301b00973))

# [1.4.0](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.19...v1.4.0) (2024-12-04)


### Features

* Переработанный функционал статусов и этапов ЖЦМ моделей ([659bb0b](https://git.sfera.inno.local/SUMD/backend/commit/659bb0bb5adcfa1d608cdff15b41eeb94531cc8c))

## [1.3.19](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.18...v1.3.19) (2024-11-29)

## [1.3.18](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.17...v1.3.18) (2024-11-27)


### Bug Fixes

* Исправление функциональности отмены разработки модели ([e8ced01](https://git.sfera.inno.local/SUMD/backend/commit/e8ced01b589d44629f3c50dd3f8e26d73b3eed74))

## [1.3.17](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.16...v1.3.17) (2024-11-22)

## [1.3.16](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.15...v1.3.16) (2024-11-11)

## [1.3.15](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.14...v1.3.15) (2024-10-14)


### Bug Fixes

* **reports:** fix missed headers ([43b87ac](https://git.sfera.inno.local/SUMD/backend/commit/43b87accb66b7da3f0e0021a5954a67a2618af33))

## [1.3.14](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.13...v1.3.14) (2024-10-14)


### Bug Fixes

* **reports:** fix missed id ([7218f02](https://git.sfera.inno.local/SUMD/backend/commit/7218f02e79db9564675a4298adc68cbe116467da))

## [1.3.13](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.12...v1.3.13) (2024-10-13)


### Bug Fixes

* **reports:** Добавление developing_end_date и model_epic_05_date в report отчеты ([1071096](https://git.sfera.inno.local/SUMD/backend/commit/1071096c73ee8789b3668a6f56c83f3affaacbb2))

## [1.3.12](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.11...v1.3.12) (2024-10-03)

## [1.3.11](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.10...v1.3.11) (2024-09-26)

## [1.3.10](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.9...v1.3.10) (2024-09-23)

## [1.3.9](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.8...v1.3.9) (2024-09-16)

## [1.3.8](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.7...v1.3.8) (2024-09-16)

## [1.3.7](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.6...v1.3.7) (2024-09-04)

## [1.3.6](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.5...v1.3.6) (2024-08-13)

## [1.3.5](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.4...v1.3.5) (2024-08-07)

## [1.3.4](https://git.sfera.inno.local/SUMD/backend/compare/v1.3.3...v1.3.4) (2024-07-23)

## [1.3.3](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.3.2...v1.3.3) (2024-07-12)

## [1.3.2](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.3.1...v1.3.2) (2024-06-07)

## [1.3.1](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.3.0...v1.3.1) (2024-05-31)

# [1.3.0](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.2.2...v1.3.0) (2023-11-26)


### Features

* new artefacts model report ([3d4f082](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/3d4f08222bef3bf79324d07eb17e78aa7cf7fca1))

## [1.2.2](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.2.1...v1.2.2) (2023-08-28)

## [1.2.1](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.2.0...v1.2.1) (2023-08-15)

# [1.2.0](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.1.2...v1.2.0) (2023-08-11)


### Features

* fix error in code while merging ([6e70a2c](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/6e70a2c214012e9e7cc02457a921a213aec08f2d))

## [1.1.2](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.1.1...v1.1.2) (2023-08-11)

## [1.1.1](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.1.0...v1.1.1) (2023-07-13)

# [1.1.0](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.13...v1.1.0) (2023-07-05)


### Features

* add user tasks report ([8d17847](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/8d178478a78087fc25b3fa4189a7000e459caaea))
* Архивные модели в отчет Модели ([fb18bb7](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/fb18bb7d9ce15532f1a53db516b86475f86f8e09))
* Добавил поле тип алгоритма в отчет по моделям ([b98c7ad](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/b98c7add732317fd7c06b165fc798c4347f31cdf))
* Доработки уведомлений и добавление названий модели ([8a7194d](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/8a7194d27cd47f828bba00a01d81aaadea7d05c9))
* Новые артефакты ([7b048f4](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/7b048f41189a186a78e6e30df9360d589687745b))
* Отчет Активные задачи пользователей ([76a5e72](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/76a5e7254b8229e80766d1be24e75eebfdb4993d))

# [1.1.0](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.13...v1.1.0) (2023-07-05)


### Features

* add user tasks report ([8d17847](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/8d178478a78087fc25b3fa4189a7000e459caaea))
* Архивные модели в отчет Модели ([fb18bb7](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/fb18bb7d9ce15532f1a53db516b86475f86f8e09))
* Добавил поле тип алгоритма в отчет по моделям ([b98c7ad](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/b98c7add732317fd7c06b165fc798c4347f31cdf))
* Доработки уведомлений и добавление названий модели ([8a7194d](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/8a7194d27cd47f828bba00a01d81aaadea7d05c9))
* Новые артефакты ([7b048f4](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/7b048f41189a186a78e6e30df9360d589687745b))
* Отчет Активные задачи пользователей ([76a5e72](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/76a5e7254b8229e80766d1be24e75eebfdb4993d))

## [1.0.13](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.12...v1.0.13) (2023-04-11)

## [1.0.12](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.11...v1.0.12) (2023-04-06)

## [1.0.11](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.10...v1.0.11) (2023-03-13)


### Bug Fixes

* update user name ([4c2b6a5](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/4c2b6a57d01f18f615467ead40fb62721226f9f1))

## [1.0.10](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.9...v1.0.10) (2023-03-13)

## [1.0.9](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.8...v1.0.9) (2023-02-12)

## [1.0.8](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.7...v1.0.8) (2023-02-02)


### Bug Fixes

* edit configs ([5cda769](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/5cda76954fa08ddbf53efd7bca8b9a50d7ec6c93))

## [1.0.7](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.6...v1.0.7) (2023-01-23)


### Bug Fixes

* add immutable ([73affb4](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/73affb4fa9d9592e4a855e97d023bbccf02a8630))
* add immutable ([a082135](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/a082135ab06436dbef2fe43173c9eb675bfd0702))
* fix commit ([d7833a8](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/d7833a8836330129902c56a9af71a1b337733c49))

## [1.0.6](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.5...v1.0.6) (2023-01-23)


### Bug Fixes

* max-line fix ([ebe3584](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/ebe3584a93858ef575947a0113ff886060ea5628))

## [1.0.5](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.4...v1.0.5) (2022-11-09)


### Bug Fixes

* add immutable true ([d83f801](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/d83f8016f3c2b398d5ab9c1a564bb452502d8bd8))

## [1.0.4](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.3...v1.0.4) (2022-08-23)


### Bug Fixes

* update tasks operations processing ([466a911](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/466a9115ef2c93376b6f59902ef745c30cba121e))

## [1.0.3](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.2...v1.0.3) (2022-05-18)

## [1.0.2](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.1...v1.0.2) (2022-05-11)


### Bug Fixes

* add readines probe ([cf37008](https://bitbucket.region.vtb.ru/scm/sumd/backend/commit/cf370087ed6b42e03b001696cb11a300036c1543))

## [1.0.1](https://bitbucket.region.vtb.ru/scm/sumd/backend/compare/v1.0.0...v1.0.1) (2022-05-11)
