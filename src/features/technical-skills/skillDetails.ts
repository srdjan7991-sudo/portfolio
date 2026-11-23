import type { Language } from '../../i18n/language'
import type { SkillName } from './skillGroups'

type SkillDetail = { description: string; context?: string }
type LocalizedSkillDetail = Readonly<Record<Language, SkillDetail>>

const details = {
  React: {
    en: {
      description: 'A JavaScript library for building user interfaces from components.',
      context: 'At Mede Analytics, I built reporting features and reusable React components during an MVC migration.',
    },
    sr: {
      description: 'JavaScript biblioteka za izradu korisničkih interfejsa od komponenti.',
      context: 'U Mede Analyticsu razvijao sam izveštaje i React komponente za višekratnu upotrebu tokom prelaska sa MVC-a.',
    },
  },
  TypeScript: {
    en: {
      description: 'Adds static types to JavaScript to catch errors and define contracts between parts of an application.',
      context: 'I used it with React to build features and maintain shared components at Mede Analytics.',
    },
    sr: {
      description: 'JavaScriptu dodaje statičke tipove za otkrivanje grešaka i definisanje ugovora između delova aplikacije.',
      context: 'Koristio sam ga uz React za razvoj funkcija i održavanje zajedničkih komponenti u Mede Analyticsu.',
    },
  },
  JavaScript: {
    en: { description: 'The programming language that handles interactions and application logic in the browser.' },
    sr: { description: 'Programski jezik za interakcije i izvršavanje logike aplikacije u pregledaču.' },
  },
  Redux: {
    en: {
      description: 'A library for managing shared application state through predictable updates.',
      context: 'At Mede Analytics, I used Redux to manage asynchronous data flows in reporting workflows.',
    },
    sr: {
      description: 'Biblioteka za upravljanje zajedničkim stanjem aplikacije kroz predvidive izmene.',
      context: 'U Mede Analyticsu koristio sam Redux za upravljanje asinhronim tokovima podataka u izveštajima.',
    },
  },
  HTML: {
    en: { description: 'Markup that gives web content its structure and semantic meaning.' },
    sr: { description: 'Jezik za označavanje koji određuje strukturu i značenje veb sadržaja.' },
  },
  CSS: {
    en: {
      description: 'A stylesheet language for typography, layout, and responsive behavior.',
      context: 'This portfolio uses CSS custom properties for its light and dark themes.',
    },
    sr: {
      description: 'Jezik stilova za tipografiju, raspored elemenata i prilagođavanje različitim ekranima.',
      context: 'Ovaj portfolio koristi prilagođena CSS svojstva za svetlu i tamnu temu.',
    },
  },
  SCSS: {
    en: { description: 'A Sass syntax that supports reusable mixins and compiles to CSS.' },
    sr: { description: 'Sass sintaksa koja omogućava ponovno korišćenje grupa stilova i prevodi se u CSS.' },
  },
  Highcharts: {
    en: {
      description: 'A JavaScript library for interactive data charts on the web.',
      context: 'At Mede Analytics, I used Highcharts to build dashboards for healthcare analytics.',
    },
    sr: {
      description: 'JavaScript biblioteka za interaktivne grafikone na vebu.',
      context: 'U Mede Analyticsu koristio sam Highcharts za izradu analitičkih prikaza za zdravstvo.',
    },
  },
  Vitest: {
    en: {
      description: 'A test runner for JavaScript and TypeScript projects that integrates with Vite.',
      context: 'Vitest runs this portfolio’s frontend tests.',
    },
    sr: {
      description: 'Alat koji pokreće JavaScript i TypeScript testove i integriše se sa Viteom.',
      context: 'Vitest pokreće testove frontenda ovog portfolija.',
    },
  },
  'React Testing Library': {
    en: {
      description: 'Tests React components through the same interface a visitor sees and uses.',
      context: 'This portfolio uses it to check how the interface responds to user interactions.',
    },
    sr: {
      description: 'Testira React komponente kroz isti interfejs koji posetilac vidi i koristi.',
      context: 'Ovaj portfolio koristi je da proveri kako interfejs reaguje na korisničke interakcije.',
    },
  },
  Jest: {
    en: { description: 'A JavaScript testing framework with a runner, assertions, and test doubles.' },
    sr: { description: 'JavaScript okvir koji omogućava pokretanje testova, proveru rezultata i zamenu zavisnosti.' },
  },
  NUnit: {
    en: { description: 'A .NET testing framework for writing automated assertions and parameterized tests.' },
    sr: { description: 'Okvir za automatizovano testiranje na .NET platformi, sa proverama rezultata i parametrizovanim testovima.' },
  },
  'C#': {
    en: {
      description: 'A strongly typed programming language for building .NET applications.',
      context: 'At Kterio, I implemented REST endpoints and service logic in C# and .NET Core.',
    },
    sr: {
      description: 'Strogo tipiziran programski jezik za izradu aplikacija na .NET platformi.',
      context: 'Na projektu Kterio pisao sam REST rute i logiku servisa u jeziku C# na platformi .NET Core.',
    },
  },
  '.NET': {
    en: {
      description: 'An application platform with a runtime and libraries for developing and running software.',
      context: 'I integrated React features with .NET Web APIs at Mede Analytics.',
    },
    sr: {
      description: 'Softverska platforma sa izvršnim okruženjem i bibliotekama za razvoj aplikacija.',
      context: 'U Mede Analyticsu povezivao sam React funkcije sa .NET veb API-jima.',
    },
  },
  'ASP.NET Core Web API': {
    en: {
      description: 'The web API framework in ASP.NET Core for handling HTTP requests and returning structured responses.',
      context: 'This portfolio uses ASP.NET Core Minimal APIs to serve public sections and save their order.',
    },
    sr: {
      description: 'Deo platforme ASP.NET Core za obradu HTTP zahteva i vraćanje strukturiranih odgovora.',
      context: 'Ovaj portfolio koristi minimalne API-je u ASP.NET Core za prikaz javnih sekcija i čuvanje njihovog redosleda.',
    },
  },
  'Entity Framework Core': {
    en: {
      description: 'Maps .NET objects to database tables and supports queries, updates, and schema migrations.',
      context: 'This portfolio uses it to map portfolio sections and account data to SQL Server.',
    },
    sr: {
      description: 'Mapira .NET objekte na tabele u bazi i podržava upite, izmene podataka i migracije šeme.',
      context: 'Ovaj portfolio ga koristi za mapiranje sekcija i podataka o nalozima u SQL Serveru.',
    },
  },
  'SQL Server': {
    en: {
      description: 'Microsoft’s relational database system for storing and querying structured data.',
      context: 'The portfolio API uses SQL Server to store section order and published section data.',
    },
    sr: {
      description: 'Microsoftov sistem relacionih baza za čuvanje i pretraživanje strukturiranih podataka.',
      context: 'API portfolija koristi SQL Server za čuvanje redosleda sekcija i podataka objavljenih sekcija.',
    },
  },
  PostgreSQL: {
    en: {
      description: 'An open-source relational database system for storing data and querying it with SQL.',
      context: 'PostgreSQL was part of the Kterio cloud platform’s stack.',
    },
    sr: {
      description: 'Sistem relacionih baza otvorenog koda za čuvanje podataka i njihovu obradu SQL upitima.',
      context: 'Platforma Kterio za podatke o objektima u oblaku koristila je PostgreSQL.',
    },
  },
  Git: {
    en: { description: 'A distributed version control system that tracks source changes and supports parallel work.' },
    sr: { description: 'Distribuirani sistem za kontrolu verzija koji prati izmene koda i podržava paralelan rad.' },
  },
  'Azure DevOps': {
    en: { description: 'A suite for tracking work, reviewing code, and automating builds and delivery.' },
    sr: { description: 'Skup alata za praćenje zadataka, pregled koda i automatizaciju izgradnje i isporuke aplikacija.' },
  },
  Figma: {
    en: {
      description: 'A collaborative design tool for specifying and prototyping user interfaces.',
      context: 'I maintained shared React components at Mede Analytics based on Figma designs.',
    },
    sr: {
      description: 'Alat za zajedničko projektovanje korisničkih interfejsa i izradu prototipova.',
      context: 'U Mede Analyticsu održavao sam zajedničke React komponente prema dizajnu iz Figme.',
    },
  },
} satisfies Record<SkillName, LocalizedSkillDetail>

export const skillDetails: Readonly<Record<SkillName, LocalizedSkillDetail>> = details

const connections: readonly (readonly [SkillName, SkillName])[] = [
  ['React', 'TypeScript'],
  ['React', 'JavaScript'],
  ['React', 'Redux'],
  ['React', 'HTML'],
  ['React', 'CSS'],
  ['React', 'Highcharts'],
  ['React', 'React Testing Library'],
  ['React', 'Figma'],
  ['TypeScript', 'JavaScript'],
  ['TypeScript', 'Vitest'],
  ['JavaScript', 'Highcharts'],
  ['HTML', 'CSS'],
  ['CSS', 'SCSS'],
  ['Vitest', 'React Testing Library'],
  ['Jest', 'React Testing Library'],
  ['C#', '.NET'],
  ['C#', 'ASP.NET Core Web API'],
  ['C#', 'NUnit'],
  ['ASP.NET Core Web API', '.NET'],
  ['ASP.NET Core Web API', 'Entity Framework Core'],
  ['ASP.NET Core Web API', 'SQL Server'],
  ['ASP.NET Core Web API', 'Redux'],
  ['Entity Framework Core', 'SQL Server'],
  ['Entity Framework Core', 'PostgreSQL'],
  ['Git', 'Azure DevOps'],
]

const adjacentSkills: Partial<Record<SkillName, SkillName[]>> = {}
for (const [source, target] of connections) {
  const sourceNeighbors = adjacentSkills[source] ??= []
  const targetNeighbors = adjacentSkills[target] ??= []
  sourceNeighbors.push(target)
  targetNeighbors.push(source)
}

export const relatedSkills: Readonly<Partial<Record<SkillName, readonly SkillName[]>>> = adjacentSkills
