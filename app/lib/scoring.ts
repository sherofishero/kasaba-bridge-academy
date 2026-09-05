/*
 * =========================================================
 * KASABA BRIDGE — SKORLAMA MOTORU
 * =========================================================
 *
 * Standart Duplicate Bridge skorlaması.
 *
 * Hesaplanan sonuç:
 *   - made: "="
 *   - overtrick: "+1", "+2", ...
 *   - down: "-1", "-2", ...
 *
 * Skor pozitifse deklarer tarafının skoru,
 * negatifse savunan tarafın skoru olarak yorumlanır.
 */

import type { Contract } from "./play";
import type { Strain } from "./auction";
import type { Vulnerability } from "./game";

export type ScoreResult = {
    result: string;
    score: number;
    scoringSide: "NS" | "EW";
};

function isVulnerable(
    declarer: "N" | "E" | "S" | "W",
    vulnerability: Vulnerability
): boolean {
    if (vulnerability === "Both") {
        return true;
    }

    if (
        vulnerability === "NS" &&
        (declarer === "N" || declarer === "S")
    ) {
        return true;
    }

    if (
        vulnerability === "EW" &&
        (declarer === "E" || declarer === "W")
    ) {
        return true;
    }

    return false;
}

function getScoringSide(
    declarer: "N" | "E" | "S" | "W"
): "NS" | "EW" {
    return declarer === "N" || declarer === "S"
        ? "NS"
        : "EW";
}

function getContractPoints(
    contract: Contract
): number {
    const { level, strain } = contract;

    if (strain === "C" || strain === "D") {
        return level * 20;
    }

    if (strain === "H" || strain === "S") {
        return level * 30;
    }

    if (strain === "NT") {
        return 40 + (level - 1) * 30;
    }

    return 0;
}

function getOvertrickValue(
    contract: Contract,
    vulnerable: boolean
): number {
    if (!contract.doubled && !contract.redoubled) {
        if (
            contract.strain === "C" ||
            contract.strain === "D"
        ) {
            return 20;
        }

        return 30;
    }

    if (contract.redoubled) {
        return vulnerable ? 400 : 200;
    }

    return vulnerable ? 200 : 100;
}

function getUndertrickScore(
    down: number,
    contract: Contract,
    vulnerable: boolean
): number {
    if (!contract.doubled && !contract.redoubled) {
        return down * (vulnerable ? 100 : 50);
    }

    if (contract.redoubled) {
        return (
            getUndertrickScore(
                down,
                {
                    ...contract,
                    redoubled: false,
                    doubled: true,
                },
                vulnerable
            ) * 2
        );
    }

    if (vulnerable) {
        return down * 200;
    }

    if (down === 1) {
        return 100;
    }

    if (down === 2) {
        return 300;
    }

    if (down === 3) {
        return 500;
    }

    return 500 + (down - 3) * 300;
}

function getContractBonus(
    contract: Contract,
    vulnerable: boolean,
    contractPoints: number
): number {
    let bonus = contractPoints >= 100
        ? vulnerable
            ? 500
            : 300
        : 50;

    if (contract.level === 6) {
        bonus += vulnerable ? 750 : 500;
    }

    if (contract.level === 7) {
        bonus += vulnerable ? 1500 : 1000;
    }

    if (contract.doubled) {
        bonus += 50;
    }

    if (contract.redoubled) {
        bonus += 100;
    }

    return bonus;
}

/**
 * Bridge kontrat skorunu hesaplar.
 *
 * tricksWon:
 * Deklarer tarafının aldığı toplam löve sayısı.
 *
 * declarer:
 * N / E / S / W
 */
export function calculateScore({
    contract,
    declarer,
    vulnerability,
    tricksWon,
}: {
    contract: Contract;
    declarer: "N" | "E" | "S" | "W";
    vulnerability: Vulnerability;
    tricksWon: number;
}): ScoreResult {
    const targetTricks = contract.level + 6;

    const vulnerable = isVulnerable(
        declarer,
        vulnerability
    );

    const scoringSide = getScoringSide(
        declarer
    );

    const difference =
        tricksWon - targetTricks;

    /*
     * KONTRAT BATTI
     */
    if (difference < 0) {
        const down = Math.abs(difference);

        const penalty = getUndertrickScore(
            down,
            contract,
            vulnerable
        );

        return {
            result: `-${down}`,
            score: -penalty,
            scoringSide:
                scoringSide === "NS"
                    ? "EW"
                    : "NS",
        };
    }

    /*
     * KONTRAT YAPILDI
     */
    const contractPoints =
        getContractPoints(contract);

    const bonus = getContractBonus(
        contract,
        vulnerable,
        contractPoints
    );

    const overtricks = difference;

    const overtrickScore =
        overtricks > 0
            ? overtricks *
              getOvertrickValue(
                  contract,
                  vulnerable
              )
            : 0;

    const score =
        contractPoints +
        bonus +
        overtrickScore;

    return {
        result:
            overtricks === 0
                ? "="
                : `+${overtricks}`,
        score,
        scoringSide,
    };
}