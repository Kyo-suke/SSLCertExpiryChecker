/// <reference path="../d.ts/common.d.ts" />
/// <reference path="./Main.ts" />
/// <reference types="jquery" />

namespace SSLCertChecker {
    /**
     * @class Inqueryer
     * @classdesc CGIからSSL証明書期限データをJSONで受け取る
     * なるべく処理に引っ張られないようにする為に非同期処理する
     */
    export class Inqueryer {
        private static _status: "ready" | "ok" | "ng" = "ready";
        private static _result: SSLCertStatusJson = null;

        constructor() {
            throw new Error("Inqueryer is static class.");
        }

        public static inquery(callback: Function = null): void {
            try {
                let options = {
                    type: "POST",
                    url: TARGET_CGI,
                    cache: false,
                    dataType: "json",
                    async: true
                };
                console.log("inquery to " + TARGET_CGI);
                // send ajax request async
                jQuery
                    .ajax(options)
                    .done((data: SSLCertStatusJson) => {
                        this._status = "ok";
                        this._result = data;
                        console.log("success to inquery. status: " + this._status);

                        if (callback) {
                            callback(data);
                        }
                    })
                    .fail(data => {
                        this._status = "ng";
                        this._result = null;
                        console.error("failed to inquery. status: " + this._status);
                        console.error(JSON.stringify(data));

                        if (callback) {
                            callback(null);
                        }
                    });
            } catch (e) {
                this._status = "ng";
                this._result = null;
                console.error("failed to inquery.");
                console.error(e.message);
                console.error(e.stack);
            }
        }

        private static _getDateString(iso8601str: string): string {
            if (!iso8601str) {
                return "-";
            }

            let ret = "";

            function _paddingStr(target: string | number, paddingChar: string, length: number): string {
                let ret = "";
                try {
                    let paddingStr: string = new Array(length + 1).join(paddingChar.slice(0, 1));
                    ret = (paddingStr + target).slice(-1 * length);
                } catch (e) {
                    ret = "" + <string>target;
                }
                return ret;
            }

            function _getTimeZoneStr(d: Date): string {
                let num = Math.abs((d.getTimezoneOffset() * 100) / 60);
                // 何故か逆なので注意
                let polarity = d.getTimezoneOffset() > 0 ? "-" : "+";
                return polarity + _paddingStr(num, "0", 4);
            }

            try {
                // new Dateとすると環境のタイムゾーンに強制される模様
                let d = new Date(iso8601str);
                ret += _paddingStr(d.getFullYear(), "0", 4);
                ret += "/" + _paddingStr(d.getMonth() + 1, "0", 2);
                ret += "/" + _paddingStr(d.getDate(), "0", 2);
                ret += " " + _paddingStr(d.getHours(), "0", 2);
                ret += ":" + _paddingStr(d.getMinutes(), "0", 2);
                ret += ":" + _paddingStr(d.getSeconds(), "0", 2);
                ret += " " + _getTimeZoneStr(d);
            } catch (e) {
                // 失敗したらそのままにしておく
                ret = iso8601str;
            }
            return ret;
        }

        public static getCertStatusList(): SSLCertStatus[] {
            if (!this._result) {
                return [];
            }
            // 可読性の為に時間を ISO 8601 から読みやすい形式に戻す
            var ret: SSLCertStatus[] = [];
            for (var i = 0; i < this._result.results.length; i++) {
                let target = this._result.results[i];
                var _temp: SSLCertStatus = {
                    hostname: target.hostname,
                    status: target.status,
                    sdate: this._getDateString(target.sdate),
                    edate: this._getDateString(target.edate),
                    version: target.version
                };
                ret.push(_temp);
            }
            // ホスト名昇順にソート
            ret.sort(
                (a: SSLCertStatus, b: SSLCertStatus): number => {
                    return a.hostname > b.hostname ? 1 : -1;
                }
            );
            return ret;
        }

        static get data(): SSLCertStatusJson {
            return this._result;
        }

        static get status(): string {
            return this._status;
        }
    }
}
