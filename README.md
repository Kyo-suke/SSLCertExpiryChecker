# SSLCertExpiryChecker
## 概要
SSL証明書の有効期限を確認し、期限切れ・期限切れが近いものをWebから確認したり、スクリプトで確認できます。

Webサービス開発・運用をしていると何だかんだ管理サーバーが多くなり、  
SSL証明書切れで実質的にサービス停止状態になっていた…という事もある為、  
できるなら確認は機械化、簡便化したい、との事で作成。

## Webから利用する
簡単に人の目で確認したい場合は、Webページから確認する事ができます。

動作にはシステムが以下を利用出来る事が条件になります。

- webサーバーアプリケーション(Apache等)
- Python3.x
    - Python2.xでは動作しません。

一式のファイルをWebサーバー上に置き、アクセス出来るようにして下さい。  
CGIやスクリプトは適切な権限設定を行って下さい。  
また、CGIの実行権限が必要になります。

設定後、後述の設定ファイルの作成を行えば、セット完了です。

index.htmlにアクセスする事で、targets.json に記述したホストのSSL証明書状態が確認できるようになります。

Web版には幾つか制約があります。

- Web版の表示時刻は閲覧者のシステムタイムゾーンに依存する。

### 対象の設定(targets.json)
確認対象のホストを記述します。

まず、 targets.template.json をコピーし、 targets.json ファイルを作成して下さい。  
json形式で、確認したいホストのhostname, portを記述します。  
以下は www1.example.com と www2.example.com に 443 ポートで確認する場合の例です。

```json
[
    {
        "hostname": "www1.example.com",
        "port": 443
    },
    {
        "hostname": "www2.example.com",
        "port": 443
    }
]

```

このファイルはCGIから読み込める必要があるので、適切な読み取り権限を付与して下さい。

### CGIの設定(config.ini)
内部的に利用するbashのパスや、SSL有効期限アラートのマージン日数の設定が行えます。  
まず、config.template.ini をコピーし、 config.ini ファイルを作成して下さい。

GLOBALセクションに設定を記述します。  
設定できる項目は以下の通りです。

| 設定 | デフォルト設定 | 説明 |
|:---:|:---:|:---|
| BASH | /usr/bin/bash | CGI内で利用するbashのパスです。 |
| GET_SSL_CERT_EXPIRY | ./scripts/GetSSLCertExpiry.sh | CGI内で利用するスクリプトのパスです。変更する必要はありません。 |
| TARGET_DATA_JSON | ./targets.json | 対象を記述するjsonのパスです。 |
| SSL_CERT_EXPIRY_ALERT_TERM | 30 | SSL証明書の有効期限アラートを出すマージン期間です。 |

このファイルはCGIから読み込める必要があるので、適切な読み取り権限を付与して下さい。

## スクリプトから利用する
cron等に仕込んで周期的に確認したい場合は[スクリプト](tools/SSLCertExpiryChecker.sh)をご利用下さい。  
詳しい利用方法は -h や --usage オプションでご確認下さい。

## 著作表示
- jQuery
    - http://jquery.com/
- Bootstrap
    - https://getbootstrap.com/
- POPPER.JS
    - https://popper.js.org/
- DataTables
    - https://datatables.net/
- html5doctor Reset Stylesheet
    - https://html5doctor.com
