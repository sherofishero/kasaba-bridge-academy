"use client";
export default function SignBoard() {
    return (
        <div className="relative w-full max-w-5xl px-4 sm:px-8">
            <svg
                viewBox="0 0 1200 500"
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label="Kasaba Bridge Hub"
                preserveAspectRatio="xMidYMid meet"
            >
                <filter
                    id="lampGlow"
                    x="-100%"
                    y="-100%"
                    width="300%"
                    height="300%"
                >
                    <feGaussianBlur
                        stdDeviation="18"
                    />
                </filter>
                <defs>
                    <linearGradient id="goldFrame" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f3d77a" />
                        <stop offset="25%" stopColor="#c8a44d" />
                        <stop offset="55%" stopColor="#8d6a25" />
                        <stop offset="78%" stopColor="#e1c467" />
                        <stop offset="100%" stopColor="#76551c" />
                    </linearGradient>
                    <pattern
                        id="goldOrnament"
                        patternUnits="userSpaceOnUse"
                        width="90"
                        height="28"
                    >
                        <rect
                            width="90"
                            height="28"
                            fill="url(#goldFrame)"
                        />

                        {/* Engraved vine */}
                        <path
                            d="
            M -10 14
            C 5 2 18 2 30 14
            C 42 26 55 26 70 14
            C 82 2 95 2 108 14
        "
                            fill="none"
                            stroke="#6f4b16"
                            strokeWidth="3"
                            strokeOpacity="0.62"
                        />

                        {/* Raised gold highlight */}
                        <path
                            d="
            M -10 11
            C 5 0 18 0 30 11
            C 42 22 55 22 70 11
            C 82 0 95 0 108 11
        "
                            fill="none"
                            stroke="#f7df82"
                            strokeWidth="1.5"
                            strokeOpacity="0.72"
                        />

                        {/* Small engraved dots */}
                        <circle
                            cx="30"
                            cy="14"
                            r="2"
                            fill="#8a641e"
                            opacity="0.75"
                        />

                        <circle
                            cx="70"
                            cy="14"
                            r="2"
                            fill="#8a641e"
                            opacity="0.75"
                        />
                    </pattern>

                    <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fff0a8" />
                        <stop offset="35%" stopColor="#c9a227" />
                        <stop offset="70%" stopColor="#8c691f" />
                        <stop offset="100%" stopColor="#e3c968" />
                    </linearGradient>

                    <linearGradient id="burgundyLeather" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#741b27" />
                        <stop offset="28%" stopColor="#65141f" />
                        <stop offset="58%" stopColor="#5c1018" />
                        <stop offset="100%" stopColor="#3f0b12" />
                    </linearGradient>

                    <radialGradient id="leatherLight" cx="50%" cy="18%" r="75%">
                        <stop offset="0%" stopColor="#b34a54" stopOpacity="0.28" />
                        <stop offset="45%" stopColor="#7b202b" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#160308" stopOpacity="0.45" />
                    </radialGradient>

                    <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fff1a8" />
                        <stop offset="28%" stopColor="#e4c766" />
                        <stop offset="58%" stopColor="#b88b22" />
                        <stop offset="82%" stopColor="#f0d879" />
                        <stop offset="100%" stopColor="#8b641c" />
                    </linearGradient>

                    <filter id="boardShadow" x="-20%" y="-30%" width="140%" height="170%">
                        <feDropShadow
                            dx="0"
                            dy="18"
                            stdDeviation="18"
                            floodColor="#000000"
                            floodOpacity="0.7"
                        />
                    </filter>

                    <filter id="textShadow" x="-20%" y="-30%" width="140%" height="170%">
                        <feDropShadow
                            dx="0"
                            dy="4"
                            stdDeviation="3"
                            floodColor="#000000"
                            floodOpacity="0.85"
                        />
                    </filter>

                    {/* MASTER KASABA SIGN SHAPE */}
                    <path
                        id="signShape"
                        d="
    M 175 150

    C 285 150 350 148 410 112
    C 475 72 520 55 600 55
    C 680 55 725 72 790 112
    C 850 148 915 150 1025 150

    L 1080 190

    L 1060 225

    C 1045 245 1045 275 1060 295

    L 1080 330
    L 1025 370

    C 915 370 850 372 790 408
    C 725 448 680 465 600 465
    C 520 465 475 448 410 408
    C 350 372 285 370 175 370

    L 120 330
    L 140 295

    C 155 275 155 245 140 225

    L 120 190
    Z
  "
                        fill="none"
                    />

                    <clipPath id="boardShape">
                        <use href="#signShape" />
                    </clipPath>
                </defs>

                {/* Unified Kasaba Sign Shape */}

                {/* Outer shadow */}
                <path
                    d="
            M 175 82
            C 265 82 315 72 375 42
            C 445 8 755 8 825 42
            C 885 72 935 82 1025 82
            C 1050 82 1065 92 1082 112
            L 1110 145
            C 1088 185 1080 215 1080 250
            C 1080 285 1088 315 1110 355
            L 1082 388
            C 1065 408 1050 418 1025 418
            C 935 418 885 428 825 458
            C 755 492 445 492 375 458
            C 315 428 265 418 175 418
            C 150 418 135 408 118 388
            L 90 355
            C 112 315 120 285 120 250
            C 120 215 112 185 90 145
            L 118 112
            C 135 92 150 82 175 82
            Z
          "
                    fill="#140807"
                    opacity="0.85"
                    filter="url(#boardShadow)"
                />

                {/* Outer gold profile with deep outer and inner bevels */}
                <g>

                    {/* Deep outer bevel */}
                    <path
                        d="
            M 175 70
            C 265 70 315 60 375 32
            C 445 0 755 0 825 32
            C 885 60 935 70 1025 70
            C 1052 70 1070 82 1088 104
            L 1118 140
            C 1098 180 1090 215 1090 250
            C 1090 285 1098 320 1118 360
            L 1088 396
            C 1070 418 1052 430 1025 430
            C 935 430 885 440 825 468
            C 755 500 445 500 375 468
            C 315 440 265 430 175 430
            C 148 430 130 418 112 396
            L 82 360
            C 102 320 110 285 110 250
            C 110 215 102 180 82 140
            L 112 104
            C 130 82 148 70 175 70
            Z
        "
                        fill="#4a2b08"
                        stroke="#1d1105"
                        strokeWidth="18"
                        strokeLinejoin="round"
                    />

                    {/* Main engraved gold frame */}
                    <path
                        d="
            M 175 70
            C 265 70 315 60 375 32
            C 445 0 755 0 825 32
            C 885 60 935 70 1025 70
            C 1052 70 1070 82 1088 104
            L 1118 140
            C 1098 180 1090 215 1090 250
            C 1090 285 1098 320 1118 360
            L 1088 396
            C 1070 418 1052 430 1025 430
            C 935 430 885 440 825 468
            C 755 500 445 500 375 468
            C 315 440 265 430 175 430
            C 148 430 130 418 112 396
            L 82 360
            C 102 320 110 285 110 250
            C 110 215 102 180 82 140
            L 112 104
            C 130 82 148 70 175 70
            Z
        "
                        fill="url(#goldOrnament)"
                        stroke="#765018"
                        strokeWidth="10"
                        strokeLinejoin="round"
                    />

                    {/* Bright outer bevel edge */}
                    <path
                        d="
            M 175 70
            C 265 70 315 60 375 32
            C 445 0 755 0 825 32
            C 885 60 935 70 1025 70
            C 1052 70 1070 82 1088 104
            L 1118 140
            C 1098 180 1090 215 1090 250
            C 1090 285 1098 320 1118 360
            L 1088 396
            C 1070 418 1052 430 1025 430
            C 935 430 885 440 825 468
            C 755 500 445 500 375 468
            C 315 440 265 430 175 430
            C 148 430 130 418 112 396
            L 82 360
            C 102 320 110 285 110 250
            C 110 215 102 180 82 140
            L 112 104
            C 130 82 148 70 175 70
            Z
        "
                        fill="none"
                        stroke="#f6d875"
                        strokeOpacity="0.75"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />

                    {/* Deep inner bevel */}
                    <path
                        d="
            M 205 112
            C 285 112 335 102 395 72
            C 455 42 745 42 805 72
            C 865 102 915 112 995 112
            L 1045 155
            C 1025 190 1018 220 1018 250
            C 1018 280 1025 310 1045 345
            L 995 388
            C 915 388 865 398 805 428
            C 745 458 455 458 395 428
            C 335 398 285 388 205 388
            L 155 345
            C 175 310 182 280 182 250
            C 182 220 175 190 155 155
            Z
        "
                        fill="none"
                        stroke="#321807"
                        strokeOpacity="0.95"
                        strokeWidth="16"
                        strokeLinejoin="round"
                    />

                    {/* Inner bevel highlight */}
                    <path
                        d="
            M 205 112
            C 285 112 335 102 395 72
            C 455 42 745 42 805 72
            C 865 102 915 112 995 112
            L 1045 155
            C 1025 190 1018 220 1018 250
            C 1018 280 1025 310 1045 345
            L 995 388
            C 915 388 865 398 805 428
            C 745 458 455 458 395 428
            C 335 398 285 388 205 388
            L 155 345
            C 175 310 182 280 182 250
            C 182 220 175 190 155 155
            Z
        "
                        fill="none"
                        stroke="#c59632"
                        strokeOpacity="0.85"
                        strokeWidth="4"
                        strokeLinejoin="round"
                    />

                </g>

                {/* Burgundy leather body */}
                <path
                    d="
    M 205 112
    C 285 112 335 102 395 72
    C 455 42 745 42 805 72
    C 865 102 915 112 995 112

    L 1045 155

    C 1025 190 1018 220 1018 250
    C 1018 280 1025 310 1045 345

    L 995 388

    C 915 388 865 398 805 428
    C 745 458 455 458 395 428
    C 335 398 285 388 205 388

    L 155 345

    C 175 310 182 280 182 250
    C 182 220 175 190 155 155

    Z
  "
                    fill="url(#burgundyLeather)"
                />


                {/* Decorative top highlight */}
                <path
                    d="M 235 115 Q 600 78 965 115"
                    fill="none"
                    stroke="#fff0a8"
                    strokeOpacity="0.32"
                    strokeWidth="3"
                />

                {/* KASABA */}
                <text
                    x="600"
                    y="245"
                    textAnchor="middle"
                    fill="url(#goldText)"
                    fontSize="112"
                    fontWeight="900"
                    letterSpacing="12"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    filter="url(#textShadow)"
                >
                    KASABA
                </text>

                {/* Gold divider */}
                <line
                    x1="385"
                    y1="282"
                    x2="815"
                    y2="282"
                    stroke="url(#goldText)"
                    strokeWidth="4"
                />

                <circle
                    cx="372"
                    cy="282"
                    r="4"
                    fill="#e3c968"
                />

                <circle
                    cx="828"
                    cy="282"
                    r="4"
                    fill="#e3c968"
                />

                {/* BRIDGE HUB */}
                <text
                    x="600"
                    y="350"
                    textAnchor="middle"
                    fill="url(#goldText)"
                    fontSize="52"
                    fontWeight="700"
                    letterSpacing="13"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    filter="url(#textShadow)"
                >
                    BRIDGE HUB
                </text>

                {/* Ceiling lamp */}
                <g
                    aria-hidden="true"
                    transform="translate(0,-180)"
                >
                    {/* Warm light falling onto the sign */}
                    <ellipse
                        cx="600"
                        cy="235"
                        rx="260"
                        ry="150"
                        fill="#ffd76a"
                        opacity="0.18"
                        filter="url(#lampGlow)"
                    />

                    {/* Concentrated light on the sign */}
                    <ellipse
                        cx="600"
                        cy="170"
                        rx="150"
                        ry="75"
                        fill="#ffe28a"
                        opacity="0.14"
                        filter="url(#lampGlow)"
                    />
                    {/* Soft downward light beam */}
                    <path
                        d="
        M 545 70
        Q 600 58 655 70
        L 820 360
        Q 600 300 380 360
        Z
    "
                        fill="#ffd76a"
                        opacity="0.035"
                        filter="url(#lampGlow)"
                    />

                    {/* Lamp suspension */}
                    <rect
                        x="592"
                        y="0"
                        width="16"
                        height="30"
                        rx="4"
                        fill="url(#goldFrame)"
                        stroke="#6d4c16"
                        strokeWidth="2"
                    />

                    {/* Lamp cap */}
                    <ellipse
                        cx="600"
                        cy="31"
                        rx="48"
                        ry="11"
                        fill="url(#goldFrame)"
                        stroke="#6d4c16"
                        strokeWidth="3"
                    />

                    {/* Lamp shade */}
                    <path
                        d="
        M 548 31
        Q 600 18 652 31
        L 680 70
        Q 600 90 520 70
        Z
    "
                        fill="url(#goldFrame)"
                        stroke="#6d4c16"
                        strokeWidth="5"
                        strokeLinejoin="round"
                    />

                    {/* Shade highlight */}
                    <path
                        d="M 555 34 Q 600 23 645 34"
                        fill="none"
                        stroke="#f3d77a"
                        strokeWidth="3"
                        opacity="0.75"
                    />

                    {/* Glowing bulb */}
                    <ellipse
                        cx="600"
                        cy="67"
                        rx="19"
                        ry="13"
                        fill="#fff0a3"
                        opacity="0.95"
                        filter="url(#lampGlow)"
                    />

                    {/* Bright bulb core */}
                    <ellipse
                        cx="600"
                        cy="67"
                        rx="9"
                        ry="6"
                        fill="#fffbe5"
                    />

                </g>

            </svg>
        </div>
    );
}