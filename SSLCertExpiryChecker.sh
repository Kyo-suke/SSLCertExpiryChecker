#!/bin/bash
#===========================================================================
# SSLCertExpiryChecker.sh
#===========================================================================
set -eu

# check openssl
which openssl > /dev/null 2>&1 || { echo "this script is required openssl."; exit 1; }

TARGET_HOSTS=""
TIMEOUT_SEC=30
ALERT_DAYS=0
IS_SILENT=0
RESULT=0

function usage(){
    echo -e "# Overview: "
    echo -e "  Check expiry of ssl certification file."
    echo -e ""
    echo -e "# Usage: "
    echo -e "  SSLCertExpiryChecker.sh <hostname1> [hostname2] [options...]"
    echo -e ""
    echo -e "# Options: "
    echo -e "  -h, --help, --usage"
    echo -e "    Show this usage."
    echo -e "  -s, --silent"
    echo -e "    Do not display output results."
    echo -e "  -t, --timeout <sec>"
    echo -e "    Set seconds connection of timeout."
    echo -e "  -d, --days <day>"
    echo -e "    If the ssl certification file expires within "
    echo -e "    the specified number of days, "
    echo -e "    return exit code 1."
    echo -e ""
}

function check(){
    if [ ${IS_SILENT} = 0 ]; then
        echo -e "------------------------------------------------------------------"
    fi
    for TARGET_HOST in ${TARGET_HOSTS}; do
        # get expire date of SSL certificate file
        set +eu
        SSL_INFO_TEXT="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:443 < /dev/null 2>&1`"
        RET_SUCCESS_GET_SSL_INFO=$?
        set -eu
        if [ ${RET_SUCCESS_GET_SSL_INFO} = 0 ]; then
            SSL_CERT_EXPIRE_STR="`timeout ${TIMEOUT_SEC} openssl s_client -connect ${TARGET_HOST}:443 < /dev/null 2>&1 | openssl x509 -text | grep "Not After" | grep -oE '[a-zA-Z]{3} [0-9]{1,2} [0-9]{2}:[0-9]{2}:[0-9]{2} [0-9]{4} [a-zA-Z]{3}'`"
        else
            SSL_CERT_EXPIRE_STR=""
        fi

        if [ ${IS_SILENT} = 0 ]; then
            echo -e "Hostname              : ${TARGET_HOST}"
            echo -en "SSL certificate expire: "
            if [ "${SSL_CERT_EXPIRE_STR}" ]; then
                echo -e "${SSL_CERT_EXPIRE_STR}"
            else
                echo -e "(Connection failed)"
            fi
            echo -e "------------------------------------------------------------------"
        fi
        if [ ! "${SSL_CERT_EXPIRE_STR}" ]; then
            RESULT=1
            continue
        fi

        # check expire and alert
        if [ ${ALERT_DAYS} -le 0 ]; then
            continue
        fi

        NOW_TIME=`date "+%s"`
        ALERT_TIME=`date -d "${SSL_CERT_EXPIRE_STR} ${ALERT_DAYS} days ago" "+%s"`
        if [ ${ALERT_TIME} -le ${NOW_TIME} ]; then
            RESULT=1
        fi
    done
    return ${RESULT}
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
        "-s" | "--silent" )
            IS_SILENT=1
            ;;
        "-t" | "--timeout" )
            TIMEOUT_SEC=${2}
            shift 1
            ;;
        "-d" | "--days" )
            ALERT_DAYS=${2}
            shift 1
            ;;
        * )
            TARGET_HOSTS="${TARGET_HOSTS} ${1}"
            ;;
    esac
    shift 1
done

# not specify target hosts
if [ ! "${TARGET_HOSTS}" ]; then
    usage
    exit 1
fi

check
exit ${RESULT}
