# Fejlesztesi dontesek

## 2026-07-03 - Electron irany

Dontes: a prototipusbol Windows/Electron app keszul.

Indok:

- a jelenlegi HTML/CSS/JS prototipus gyorsan atemelheto
- Windowsos munkagepeken egyszeruen telepitheto
- kesobb sajat PDF export es helyi fajl/adatbazis kezeles adhat hozza stabilitast

## 2026-07-03 - SQLite helyi adatbazis

Dontes: eles hasznalatra a `localStorage` helyett SQLite legyen.

Indok:

- biztonsagosabb helyi tarolas
- konnyebb menteni es migraciot kezelni
- jobb alap tobb eves arlista es ajanlat adatnak
- kesobb CRM szinkronhoz rendezettebb adatmodell kell

## 2026-07-03 - CRM kesobbi adapterkent

Dontes: CRM integracio ne az elso Electron lepesben keszuljon, de az adatmodell mar keszuljon fel ra.

Indok:

- az arszamitas es helyi app stabilitasa fontosabb
- CRM nelkul is mukodnie kell az appnak
- kesobb adapterrel kevesebb kockazattal kapcsolhato ra kulso rendszer
