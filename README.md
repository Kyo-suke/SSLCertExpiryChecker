# SSLCertExpiryChecker
Check expiry of ssl certification file.

# Usage
```shell
$ ./SSLCertExpiryChecker.sh <hostname1> \[hostname2\] \[options...\]
```

It's for example.

```shell
$ ./SSLCertExpiryChecker.sh www.example.com
------------------------------------------------------------------
Hostname              : www.example.com
SSL certificate expire: Jun 23 01:23:45 2019 GMT
------------------------------------------------------------------
```

# Options:
## -h, --help, --usage
Show usage.

## -s, --silent
Do not display output results.

## -t, --timeout <sec>
Set seconds connection of timeout.

## -d, --days <day>
If the ssl certification file expires within the specified number of days, return exit code 1.
