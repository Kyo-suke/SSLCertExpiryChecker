#!/bin/bash
#===========================================================================
# SSLCertExpiryChecker.sh
#===========================================================================
set -eu

# check openssl
which openssl > /dev/null 2>&1 || { echo "this script is required openssl."; exit 1; }

TARGET_HOST=""
TIMEOUT_SEC=30
ALERT_DAYS=0
PORT="443"
RESULT=0

function usage(){
    echo -e "# Overview: "
    echo -e "  Check expiry of ssl certification file."
    echo -e ""
    echo -e "# Usage: "
    echo -e "  SSLCertExpiryChecker.sh <hostname> [options...]"
    echo -e ""
    echo -e "# Options: "
    echo -e "  -h, --help, --usage"
    echo -e "    Show this usage."
    echo -e "  -t, --timeout <sec>"
    echo -e "    Set seconds connection of timeout."
    echo -e "  -d, --days <day>"
    echo -e "    If the ssl certification file expires within "
    echo -e "    the specified number of days, "
    echo -e "    return exit status 3."
    echo -e "  -p, --port <port>"
    echo -e "    Specify port for checking SSL certification file."
    echo -e "    default using port is 443."
    echo -e ""
    echo -e "# Exit status: "
    echo -e "  0: If OK.(the ssl certification file is valid.)"
    echo -e "  1: If error occered."
    echo -e "  2: If the ssl certification file is expired."
    echo -e "  3: If the ssl certification file expires within specified days."
    echo -e ""
}

function check(){
    # get expire date of SSL certificate file
    set +eu
    SSL_INFO_TEXT="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:${PORT} < /dev/null 2>&1`"
    RET_SUCCESS_GET_SSL_INFO=$?
    set -eu
    if [ ${RET_SUCCESS_GET_SSL_INFO} = 0 ]; then
        SSL_CERT_EXPIRE_STR="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:${PORT} < /dev/null 2>&1 | openssl x509 -text | grep "Not After" | grep -oE '[a-zA-Z]{3} [0-9]{1,2} [0-9]{2}:[0-9]{2}:[0-9]{2} [0-9]{4} [a-zA-Z]{3}'`"
    else
        SSL_CERT_EXPIRE_STR=""
    fi

    echo -e "Hostname              : ${TARGET_HOST}"
    echo -en "SSL certificate expire: "
    if [ "${SSL_CERT_EXPIRE_STR}" ]; then
        echo -e "${SSL_CERT_EXPIRE_STR}"
    else
        echo -e "(Connection failed)"
    fi
    if [ ! "${SSL_CERT_EXPIRE_STR}" ]; then
        echo -e "Status                : unknown"
        return 1
    fi

    NOW_TIME=`date "+%s"`
    # check expired
    SSL_CERT_TIME=`date -d "${SSL_CERT_EXPIRE_STR}" "+%s"`
    if [ ${SSL_CERT_TIME} -le ${NOW_TIME} ]; then
        echo -e "Status                : expired"
        return 2
    fi

    # check expired with margin
    ALERT_TIME=`date -d "${SSL_CERT_EXPIRE_STR} ${ALERT_DAYS} days ago" "+%s"`
    if [ ${ALERT_TIME} -le ${NOW_TIME} ]; then
        echo -e "Status                : warn"
        return 3
    fi

    # valid
    echo -e "Status                : valid"
    return 0
}

# entry point
if [ $#  -le 0 ]; then
    usage
    exit 1
fi

while [ $# -ge 1 ]; do
    case "${1}" in
        "-h" | "--help" | "--usage" )
            usage
            exit 0
            ;;
        "-t" | "--timeout" )
            TIMEOUT_SEC=${2}
            shift 1
            ;;
        "-p" | "--port" )
            PORT="${2}"
            shift 1
            ;;
        "-d" | "--days" )
            ALERT_DAYS=${2}
            shift 1
            ;;
        * )
            if [ "${TARGET_HOST}" != "" ]; then
                usage
                exit 1
            fi
            TARGET_HOST="${1}"
            ;;
    esac
    shift 1
done

# not specify target hosts
if [ ! "${TARGET_HOST}" ]; then
    usage
    exit 1
fi

check
RESULT=$?
exit ${RESULT}
