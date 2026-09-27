# LMOONDU: a second publication of the same interface

This bundle (`http://bundles/LMOONDU-v2/index.json`) carries the same interface source and the same verifier keys as LMOONDU's first bundle, so it verifies at Levels 1-3 against the same deployed contract; this file and its location make its content — and so its commitment — differ.

P2 (spec 00024 §9.2): a second VALID publication of LMOONDU's interface with other content — the same interface source and keys, a new location and one more listed file (PUBLICATION.md), so a different commitment. Project 00024-03-C publishes it and the first one in the same block; the indexer must make the later one (by transaction position) current.
