import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path("/home/shashank/Desktop/cgc/CodeGraphContext/src")))

from codegraphcontext.tools import scip_pb2

def dump_scip(path):
    with open(path, "rb") as f:
        index = scip_pb2.Index()
        index.ParseFromString(f.read())
    
    print(f"Index has {len(index.documents)} documents")
    for doc in index.documents:
        print(f"\nDocument: {doc.relative_path}")
        for occ in doc.occurrences:
            role = "DEF" if occ.symbol_roles & 1 else "REF"
            print(f"  {role} {occ.symbol} at {occ.range}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        dump_scip(sys.argv[1])
