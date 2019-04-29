var SSLCertChecker;
(function (SSLCertChecker) {
    SSLCertChecker.TARGET_CGI = "./GetSSLCertStatus.cgi";
    var Inqueryer = (function () {
        function Inqueryer() {
            throw new Error("Inqueryer is static class.");
        }
        Inqueryer.inquery = function (callback) {
            var _this = this;
            if (callback === void 0) { callback = null; }
            try {
                var options = {
                    type: "POST",
                    url: SSLCertChecker.TARGET_CGI,
                    cache: false,
                    dataType: "json",
                    async: true
                };
                console.log("inquery to " + SSLCertChecker.TARGET_CGI);
                jQuery
                    .ajax(options)
                    .done(function (data) {
                    _this._status = "ok";
                    _this._result = data;
                    console.log("success to inquery. status: " + _this._status);
                    if (callback) {
                        callback(data);
                    }
                })
                    .fail(function (data) {
                    _this._status = "ng";
                    _this._result = null;
                    console.error("failed to inquery. status: " + _this._status);
                    console.error(JSON.stringify(data));
                    if (callback) {
                        callback(null);
                    }
                });
            }
            catch (e) {
                this._status = "ng";
                this._result = null;
                console.error("failed to inquery.");
                console.error(e.message);
                console.error(e.stack);
            }
        };
        Inqueryer.getDateString = function (iso8601str) {
            if (!iso8601str) {
                return "-";
            }
            var ret = "";
            function _paddingStr(target, paddingChar, length) {
                var ret = "";
                try {
                    var paddingStr = new Array(length + 1).join(paddingChar.slice(0, 1));
                    ret = (paddingStr + target).slice(-1 * length);
                }
                catch (e) {
                    ret = "" + target;
                }
                return ret;
            }
            function _getTimeZoneStr(d) {
                var num = Math.abs((d.getTimezoneOffset() * 100) / 60);
                var polarity = d.getTimezoneOffset() > 0 ? "-" : "+";
                return polarity + _paddingStr(num, "0", 4);
            }
            try {
                var d = new Date(iso8601str);
                ret += _paddingStr(d.getFullYear(), "0", 4);
                ret += "/" + _paddingStr(d.getMonth() + 1, "0", 2);
                ret += "/" + _paddingStr(d.getDate(), "0", 2);
                ret += " " + _paddingStr(d.getHours(), "0", 2);
                ret += ":" + _paddingStr(d.getMinutes(), "0", 2);
                ret += ":" + _paddingStr(d.getSeconds(), "0", 2);
                ret += " " + _getTimeZoneStr(d);
            }
            catch (e) {
                ret = iso8601str;
            }
            return ret;
        };
        Inqueryer.getCertStatusList = function () {
            if (!this._result) {
                return [];
            }
            var ret = [];
            for (var i = 0; i < this._result.results.length; i++) {
                var target = this._result.results[i];
                var _temp = {
                    hostname: target.hostname,
                    status: target.status,
                    sdate: this.getDateString(target.sdate),
                    edate: this.getDateString(target.edate),
                    version: target.version
                };
                ret.push(_temp);
            }
            return ret;
        };
        Object.defineProperty(Inqueryer, "data", {
            get: function () {
                return this._result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Inqueryer, "status", {
            get: function () {
                return this._status;
            },
            enumerable: true,
            configurable: true
        });
        Inqueryer._status = "ready";
        Inqueryer._result = null;
        return Inqueryer;
    }());
    SSLCertChecker.Inqueryer = Inqueryer;
    var UIManager = (function () {
        function UIManager() {
            throw new Error("Inqueryer is static class.");
        }
        UIManager.showLoading = function (showed) {
            var loading = jQuery("#" + this.LOADING_ID);
            if (showed) {
                loading.addClass("loaded");
            }
            else {
                loading.removeClass("loaded");
            }
        };
        UIManager.initDataTables = function () {
            jQuery.extend(jQuery.fn.dataTable.defaults, {
                language: this.DATATABLES_JP
            });
        };
        UIManager.setTableRow = function (datas) {
            var table = jQuery("#" + this.TABLE_ID);
            table.DataTable({
                data: datas,
                columns: [{ data: "hostname" }, { data: "status" }, { data: "sdate" }, { data: "edate" }],
                scrollCollapse: true,
                pageLength: 50,
                rowCallback: function (row, data) {
                    switch (data.status) {
                        case "valid":
                            jQuery(row).addClass("valid");
                            break;
                        case "warn":
                            jQuery(row).addClass("warn");
                            break;
                        case "expired":
                            jQuery(row).addClass("expired");
                            break;
                        default:
                            jQuery(row).addClass("unknown");
                            break;
                    }
                }
            });
        };
        UIManager.clearTable = function () {
            var tbody = jQuery("#" + this.TABLE_ID + " tbody");
            tbody.empty();
        };
        UIManager.TABLE_ID = "ssl-cert-status";
        UIManager.LOADING_ID = "loading";
        UIManager.DATATABLES_JP = {
            sProcessing: "処理中...",
            sLengthMenu: "_MENU_ 件表示",
            sZeroRecords: "データはありません。",
            sInfo: " _TOTAL_ 件中 _START_ から _END_ まで表示",
            sInfoEmpty: " 0 件中 0 から 0 まで表示",
            sInfoFiltered: "（全 _MAX_ 件より抽出）",
            sInfoPostFix: "",
            sSearch: "検索:",
            sUrl: "",
            oPaginate: {
                sFirst: "先頭",
                sPrevious: "前",
                sNext: "次",
                sLast: "最終"
            }
        };
        return UIManager;
    }());
    SSLCertChecker.UIManager = UIManager;
    function update(json) {
        UIManager.clearTable();
        UIManager.showLoading(true);
        if (!json) {
            return;
        }
        var datas = Inqueryer.getCertStatusList();
        UIManager.setTableRow(datas);
    }
    SSLCertChecker.update = update;
    function main() {
        jQuery("[data-toggle='tooltip'").tooltip();
        UIManager.initDataTables();
        Inqueryer.inquery(update);
    }
    SSLCertChecker.main = main;
    document.addEventListener("DOMContentLoaded", function () {
        SSLCertChecker.main();
    });
})(SSLCertChecker || (SSLCertChecker = {}));
