# CHANGELOG
## v1.1.0
### Added
- CSVダウンロード機能を追加。

### Changed
- Pythonのタイムゾーン周りが不安だったので、内部的に利用しているshellの返り値をunix timeに変更。
- 管理を簡便にする為にTypeScriptファイルをクラス別に分割。
- メソッドの命名規則などの調整。

### Fixed
- htmlからminify版のcssを参照していなかった。
- 削除したファイルの参照が残ったままでビルドが通らなかった。

## v1.0.0
### Added
- webページ上から確認できるようにした。
    - 要Python3, Apache等のwebサーバー。

### Changed
- スクリプトの返り値などを調整。cron等で利用しやすい様に。

## v0.0.1
Initial release.
