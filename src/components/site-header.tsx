import Image from "next/image";
import Link from "next/link";

import carcarahMark from "@/app/carcarah.png";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="Painel do Carcarah">
          <span className="brand__mark" aria-hidden="true">
            <Image
              alt=""
              height={34}
              priority
              src={carcarahMark}
              width={40}
            />
          </span>
          <span>Carcarah</span>
        </Link>
        <span className="demo-label">Dados de demonstração</span>
      </div>
    </header>
  );
}
