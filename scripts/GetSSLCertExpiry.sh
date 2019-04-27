#!/usr/bin/bash
set -eu

# check openssl
which openssl > /dev/null 2>&1 || { echo -e ""; exit 1; }

TARGET_HOST=""
TIMEOUT_SEC=15
PORT=443

IS_START_OPTION=0
IS_END_OPTION=0

# SSL証明書の有効期限：開始日を標準出力する
function ssl_cert_start_date(){
    set +eu
    SSL_CERT_START_STR="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:${PORT} < /dev/null 2> /dev/null | openssl x509 -text | grep 'Not Before' | grep -oE '[a-zA-Z]{3} +[0-9]{1,2} +[0-9]{2}:[0-9]{2}:[0-9]{2} +[0-9]{4} +[a-zA-Z]{3}'`"
    RET_IS_SUCCESS=$?
    set -eu

    if [ ! ${RET_IS_SUCCESS} = 0 ]; then
        echo -e "failed to get ssl cert informations."
        return 1
    fi

    # output
    echo -e "${SSL_CERT_START_STR}"
    return 0
}

# SSL証明書の有効期限：終了日を標準出力する
function ssl_cert_end_date(){
    set +eu
    SSL_CERT_END_STR="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:${PORT} < /dev/null 2> /dev/null | openssl x509 -text | grep 'Not After' | grep -oE '[a-zA-Z]{3} +[0-9]{1,2} +[0-9]{2}:[0-9]{2}:[0-9]{2} +[0-9]{4} +[a-zA-Z]{3}'`"
    RET_IS_SUCCESS=$?
    set -eu

    if [ ! ${RET_IS_SUCCESS} = 0 ]; then
        echo -e "failed to get ssl cert informations."
        return 1
    fi

    # output
    echo -e "${SSL_CERT_END_STR}"
    return 0
}

# entry point
if [ $# -le 1 ]; then
    echo -e "invalid arguments."
    exit 1
fi

while [ $# -ge 1 ]; do
    case "${1}" in
        "-s" | "--start" )
            IS_START_OPTION=1
            ;;
        "-e" | "--end" )
            IS_END_OPTION=1
            ;;
        "-p" | "--port" )
            PORT="${2}"
            shift 1
            ;;
        * )
            TARGET_HOST="${1}"
            ;;
    esac

    if [ ${IS_START_OPTION} = 1 -a ${IS_END_OPTION} = 1 ]; then
        echo -e "invalid arguments."
        exit 1
    fi
    shift 1
done

if [ ${IS_START_OPTION} = 1 ]; then
    ssl_cert_start_date || exit 1
elif [ ${IS_END_OPTION} = 1 ]; then
    ssl_cert_end_date || exit 1
fi

exit 0
