import sys
for l in open(sys.argv[1]+"/audit.txt",encoding="utf8"):
    print(l[:int(sys.argv[2]) if len(sys.argv)>2 else 330].rstrip())
