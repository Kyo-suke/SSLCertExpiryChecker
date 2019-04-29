# -*- coding: utf-8 -*-
import os
import sys
import json
import time
import datetime
import threading
import subprocess
import traceback
try:
    import ssl
except Exception as e:
    # response error json
    ret_json = {
        "status": "ng",
        "statusCode": 500,
        "results": [],
        "expiryAlertTerm": None,
        "timestamp": int(time.time()),
        "message": traceback.format_exc()
    }
    json_body = json.dumps(ret_json, ensure_ascii=False, sort_keys=True)
    print("Content-Type: application/json")
    print()
    print(json_body)
    sys.exit(1)

#----------------------------------------------------------------
# global config
#----------------------------------------------------------------
__VERSION__ = "1.0.0"
BASH = "/usr/bin/bash"
GET_SSL_CERT_EXPIRY = "GetSSLCertExpiry.sh"

# 監視対象が記述された設定ファイル
TARGET_DATA_JSON = "./targets.json"

# SSL証明書切れそう判定期間の定義[日]
SSL_CERT_EXPIRY_ALERT_TERM = 60

# config.iniに書かれた設定があれば上書き
import configparser
CONFIG_INI = "config.ini"

def load_config_ini():
    global CONFIG_INI
    global BASH
    global GET_SSL_CERT_EXPIRY
    global TARGET_DATA_JSON
    global SSL_CERT_EXPIRY_ALERT_TERM

    section = "GLOBAL"
    try:
        ini_parser = configparser.SafeConfigParser()
        if not ini_parser.read(CONFIG_INI):
            return
        if not ini_parser.has_section(section):
            return

        # load
        if ini_parser.has_option(section, "BASH"):
            BASH = ini_parser.get(section, "BASH")
        if ini_parser.has_option(section, "GET_SSL_CERT_EXPIRY"):
            GET_SSL_CERT_EXPIRY = ini_parser.get(section, "GET_SSL_CERT_EXPIRY")
        if ini_parser.has_option(section, "TARGET_DATA_JSON"):
            TARGET_DATA_JSON = ini_parser.get(section, "TARGET_DATA_JSON")
        if ini_parser.has_option(section, "SSL_CERT_EXPIRY_ALERT_TERM"):
            SSL_CERT_EXPIRY_ALERT_TERM = ini_parser.getint(section, "SSL_CERT_EXPIRY_ALERT_TERM")
    except Exception as e:
        sys.stderr.write(traceback.format_exc())
        pass
    return
load_config_ini()
#----------------------------------------------------------------

class ResponseJson(object):
    """
    HTTP Responseで返却するjsonのデータを扱うクラス
    """
    STATUS_OK = "ok"
    STATUS_NG = "ng"

    def __init__(self):
        cls = ResponseJson

        self._entity = cls._get_template()
        self._status = cls.STATUS_OK
        self._status_code = None
        self._results = []
        self._expiry_alert_term = None
        self._timestamp = int(time.time())
        self._message = ""
        return

    @classmethod
    def _get_template(cls):
        global __VERSION__
        _json = {
            "status": None,
            "statusCode": None,
            "results": [],
            "expiryAlertTerm": None,
            "timestamp": None,
            "message": "",
            "version": __VERSION__
        }
        return _json

    def _update_entity(self):
        global __VERSION__
        self._entity["status"] = self._status
        self._entity["statusCode"] = self._status_code
        self._entity["results"] = self._results
        self._entity["expiryAlertTerm"] = self._expiry_alert_term
        self._entity["timestamp"] = self._timestamp
        self._entity["message"] = self._message
        self._entity["version"] = __VERSION__
        return

    def get_string(self):
        ret = ""
        try:
            self._update_entity()
            ret = json.dumps(self.entity, ensure_ascii=False, sort_keys=True)
        except Exception as e:
            sys.stderr.write(traceback.format_exc())
            ret = ""
            pass
        return ret

    def append_results(self, cert_status):
        if not isinstance(cert_status, SSLCertStatus):
            raise Exception("Invalid object.")
        data = {
            "hostname": cert_status.hostname,
            "status": cert_status.status,
            "sdate": cert_status.sdate,
            "edate": cert_status.edate
        }
        self._results.append(data)
        return

    # getter
    @property
    def entity(self):
        return self._entity

    @property
    def status(self):
        return self._status

    @property
    def statusCode(self):
        return self._status_code

    @property
    def expiryAlertTerm(self):
        return self._expiry_alert_term

    @property
    def timestamp(self):
        return self._timestamp

    # setter
    @status.setter
    def status(self, status):
        self._status = status
        self._update_entity()

    @statusCode.setter
    def statusCode(self, status_code):
        self._status_code = status_code
        self._update_entity()

    @expiryAlertTerm.setter
    def expiryAlertTerm(self, expiry_alert_term):
        self._expiry_alert_term = expiry_alert_term
        self._update_entity()

    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp
        self._update_entity()
    pass

class Response(object):
    """
    HTTPレスポンスを返す子
    """
    HEADER_CONTENT_TYPE = "Content-Type: application/json"

    @classmethod
    def response(cls, response_json):
        """
        正常系HTTP response
        基本は200 OKを返す
        """
        response_json.status = ResponseJson.STATUS_OK
        response_json.statusCode = 200
        print(cls.HEADER_CONTENT_TYPE)
        print("")
        print(response_json.get_string(), end="")
        return

    @classmethod
    def error(cls, message = ""):
        """
        異常系HTTP response
        一応動いている訳なので503を返す
        """
        response_json = ResponseJson()
        response_json.status = ResponseJson.STATUS_NG
        response_json.statusCode = 503
        response_json.message = message

        print(cls.HEADER_CONTENT_TYPE)
        print("")
        print(response_json.get_string(), end="")
        return
    pass

class TargetsJsonViewer(object):
    """
    targets.jsonを都合良く使う為のViewer
    """
    def __init__(self, json_file_path):
        self._json_file_path = json_file_path
        self._entity = None
        self._load()
        return

    def __iter__(self):
        return iter(self._entity)

    def _load(self):
        """
        jsonファイルから対象情報を読み込み変数に保持する
        """
        def _unicode_to_utf8(_data):
            # unicode string is type "str" on python3
            if isinstance(_data, str):
                return _data.encode("utf-8", "replace")
            if isinstance(_data, list):
                return [ _unicode_to_utf8(_i) for _i in _data ]
            if isinstance(_data, dict):
                _tmp = {}
                for _key, _val in _data.items():
                    _tmp.update( {_unicode_to_utf8(_key): _unicode_to_utf8(_val)} )
                return _tmp
            return _data

        fp = None
        try:
            body = ""
            with open(self._json_file_path, "rb") as fp:
                body = fp.read()
                pass
            # convert json string to json dict object
            self._entity = json.loads(body)
        except Exception as e:
            sys.stderr.write(traceback.format_exc())
            raise e
        return

    # getter
    @property
    def data(self):
        return self._entity

    @property
    def hosts(self):
        return [x["hostname"] for x in self._entity]
    pass

class SSLCertStatus(object):
    """
    SSL証明書のステータスを管理するクラス
    """
    VALID   = "valid"       # 有効期限内
    WARN    = "warn"        # 有効期限切れそう
    EXPIRED = "expired"     # 有効期限切れ
    UNKNOWN = "unknown"     # わかんない

    def __init__(self, hostname, sdate, edate, days=0):
        """
        constructor
        @param {string} hostname taget hostname
        @param {string} sdate Validity Not Before on SSL cert info
        @param {string} edate Validity Not After on SSL cert info
        @param {integer} number of margin days
        """
        cls = SSLCertStatus
        self._hostname = hostname
        self._sdate = cls._get_date(sdate)
        self._edate = cls._get_date(edate)
        self._status = cls.UNKNOWN
        self._update_status(days)
        return

    @classmethod
    def _get_date(cls, target):
        """
        opensslコマンドで得た証明書日時文字列をdatetimeオブジェクトに変換する
        example: 
        Feb 23 17:00:08 2019 GMT => datetime.datetime(2019, 2, 24, 2, 0, 8, ... , "JST")
        @param {string} target 対象文字列
        @return {datetime}
        """
        ret = None
        if not target:
            return None
        try:
            target = target.rstrip("\n")

            # SSL証明書の記述はグリニッジ標準時で記述される模様
            # epoch timeはUTCからの経過時間の為、タイムゾーン情報が無い
            # datetimeオブジェクト生成時には必ずtimezone情報を持たせる

            # GMT -> UTC (意味合い的にはほぼ同じ)
            epoch = ssl.cert_time_to_seconds(target)

            # UTC -> local timezone
            tz = cls._get_local_timezone()
            ret = datetime.datetime.fromtimestamp(epoch, tz)
        except Exception as e:
            ret = None
            sys.stderr.write(traceback.format_exc())
            pass
        return ret

    @classmethod
    def _get_local_timezone(cls):
        # local timezone
        tz_name = time.tzname[0].lower()
        tz = None
        if tz_name == "jst":
            tz = datetime.timezone(datetime.timedelta(hours=+9), 'JST')
        elif tz_name == "utc":
            tz = datetime.timezone.utc
        else:
            raise Exception("Not supported timezone {0}".format(tz_name))
        return tz

    def _update_status(self, days=0):
        """
        証明書の期限から状態を更新する
        @param {days} [days=0] 有効期限のマージン日数
        """
        cls = SSLCertStatus
        try:
            # 有効期限切れの場合
            if not self._is_valid(0):
                self._status = cls.EXPIRED
                return
            # 有効期限がマージン日数未満の場合
            if not self._is_valid(days):
                self._status = cls.WARN
                return
            # 有効期限内の場合
            self._status = cls.VALID
        except Exception as e:
            # 判定失敗
            self._status = cls.UNKNOWN
            pass
        return

    def _is_valid(self, days=0):
        """
        SSL証明書の有効期限内であるかを返す
        @param {int} [days=0] 期限判定時に用いるマージン日数
        例えば30とすると、現在日が証明書有効期限の-30日である際に有効期限切れ扱いとする
        @return {boolean} True: 有効期限内, False: 有効期限切れ
        """
        cls = SSLCertStatus
        if (not self.sdate) or (not self.edate):
            return False
        ret = False
        try:
            # 現在から引数に指定した日数を加算して、証明書期限を超えていればNGとする
            tz = cls._get_local_timezone()
            now = datetime.datetime.now(tz=tz)
            ret = self._edate > (now + datetime.timedelta(days=days))
        except Exception as e:
            sys.stderr.write(traceback.format_exc())
            raise e
        return ret

    # getter
    @property
    def expired(self):
        return self._is_valid()

    @property
    def hostname(self):
        return self._hostname

    @property
    def sdate(self):
        """ 期限開始日をES2015仕様に基づきRFC8601形式で返す """
        return self._sdate.isoformat() if self._sdate else ""

    @property
    def edate(self):
        """ 期限終了日をES2015仕様に基づきRFC8601形式で返す """
        return self._edate.isoformat() if self._edate else ""

    @property
    def status(self):
        return self._status
    pass

class SSLCertExpiryChecker(object):
    """

    """
    def __init__(self, json_file_path=None):
        if not json_file_path:
            json_file_path = TARGET_DATA_JSON
            pass
        self._targets = TargetsJsonViewer(json_file_path)
        self._cert_status = []
        return

    def get_status(self):
        """
        ターゲットのSSL証明書ステータスを取得する
        threadで並列化し、タイムアウト等で全体の処理時間を引っ張らないようにする
        """
        # get ssl cert info on threading task
        def _proc(results, target):
            global BASH
            global GET_SSL_CERT_EXPIRY
            global SSL_CERT_EXPIRY_ALERT_TERM
            try:
                hostname = target["hostname"]
                port = target["port"]
                # SSL証明書有効期間：開始日を取得
                shcmd_s = "{0} {1} -s {2} -p {3}".format(BASH, GET_SSL_CERT_EXPIRY, hostname, port)
                output_s = subprocess.check_output(shcmd_s.split()).decode(sys.stdout.encoding)
                # SSL証明書有効期間：終了日を取得
                shcmd_e = "{0} {1} -e {2} -p {3}".format(BASH, GET_SSL_CERT_EXPIRY, hostname, port)
                output_e = subprocess.check_output(shcmd_e.split()).decode(sys.stdout.encoding)
                cert_status = SSLCertStatus(hostname, output_s, output_e, SSL_CERT_EXPIRY_ALERT_TERM)
            except Exception as e:
                # sys.stderr.write(traceback.format_exc())
                cert_status = SSLCertStatus(hostname, None, None, SSL_CERT_EXPIRY_ALERT_TERM)
                pass
            results.append(cert_status)
            return

        results = []
        threads = []
        try:
            # threadの実行、処理実行待ち合わせ
            for target in self._targets:
                thread = threading.Thread(target=_proc, args=([results, target]), name=target["hostname"])
                thread.start()
                threads.append(thread)
                continue
            for thread in threads:
                thread.join()
                continue
        except Exception as e:
            results = []
            sys.stderr.write(traceback.format_exc())
            pass
        return results
    pass

def main():
    global SSL_CERT_EXPIRY_ALERT_TERM
    a = SSLCertExpiryChecker()
    j = ResponseJson()
    j.expiryAlertTerm = SSL_CERT_EXPIRY_ALERT_TERM
    for n in a.get_status():
        j.append_results(n)
    Response.response(j)
    return

if __name__ == "__main__":
    main()
