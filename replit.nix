{pkgs}: {
  deps = [
    pkgs.systemd
    pkgs.expat
    pkgs.libxkbcommon
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.dbus
    pkgs.fontconfig
    pkgs.freetype
    pkgs.pango
    pkgs.cairo
    pkgs.libdrm
    pkgs.nspr
    pkgs.nss
    pkgs.alsa-lib
    pkgs.libgbm
    pkgs.glib
  ];
}
