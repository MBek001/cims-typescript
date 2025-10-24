Name:           cims
Version:        0.1.0
Release:        1%{?dist}
Summary:        CIMS Desktop Application

License:        MIT
URL:            https://github.com/abbskhnv/cims-typescript
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  rust-packaging
BuildRequires:  cargo
BuildRequires:  webkit2gtk4.0-devel
BuildRequires:  openssl-devel
BuildRequires:  gtk3-devel
BuildRequires:  libappindicator-gtk3-devel
BuildRequires:  nodejs
BuildRequires:  pnpm
Requires:       webkit2gtk4.0
Requires:       openssl
Requires:       gtk3
Requires:       libappindicator-gtk3

%description
CIMS is a desktop application built with Tauri and Next.js

%prep
%autosetup

%build
pnpm install
pnpm build
cd src-tauri && cargo build --release

%install
mkdir -p %{buildroot}%{_bindir}
mkdir -p %{buildroot}%{_datadir}/applications
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/128x128/apps

cp src-tauri/target/release/%{name} %{buildroot}%{_bindir}/
cp src-tauri/icons/128x128.png %{buildroot}%{_datadir}/icons/hicolor/128x128/apps/%{name}.png

cat > %{buildroot}%{_datadir}/applications/%{name}.desktop << EOF
[Desktop Entry]
Name=CIMS
Comment=CIMS Desktop Application
Exec=%{name}
Icon=%{name}
Terminal=false
Type=Application
Categories=Utility;
EOF

%files
%{_bindir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png

%changelog
* Thu Mar 21 2024 Initial Release
- First package release
