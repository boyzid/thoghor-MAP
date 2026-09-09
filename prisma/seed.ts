import "dotenv/config";
import { PrismaClient, Priority, ProjectStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface SeedGap {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  skills: string[];
}

interface SeedResult {
  id: string;
  title: string;
  description: string;
}

interface SeedLesson {
  id: string;
  title: string;
  description: string;
}

interface SeedProject {
  id: string;
  gapId: string;
  title: string;
  owner: string;
  country: string;
  contact?: string;
  summary: string;
  status: ProjectStatus;
  results?: SeedResult[];
  lessons?: SeedLesson[];
}

const INITIAL_GAPS: SeedGap[] = [
  {
    id: "g1",
    title: "دعم وتفريغ نخبة من المصلحين ماديًا",
    description:
      "إيجاد صيغ وقفية أو تمويلية تتيح تفرغ عدد من العاملين الأكفاء بدل استنزافهم في متطلبات الحياة.",
    category: "بناء وتمكين",
    priority: Priority.high,
    skills: ["تمويل", "إدارة أوقاف", "دعم مؤسسي"],
  },
  {
    id: "g2",
    title: "تصدير المنهج الإصلاحي إعلاميًا وتبسيطه",
    description:
      "تحويل الأفكار المنهجية الكبرى إلى محتوى مبسّط وقابل للانتشار (مقالات، رسوم، حلقات قصيرة).",
    category: "إعلام ومحتوى",
    priority: Priority.high,
    skills: ["كتابة", "تصميم", "فيديو", "تحرير"],
  },
  {
    id: "g3",
    title: "مبادرات لمّ الشمل بين العاملين المتفرقين",
    description:
      "خلق مساحات تعاون عملية بين فرق ومصلحين مختلفين لتقليل الازدواجية والتنافس غير المجدي.",
    category: "تنسيق وتعاون",
    priority: Priority.medium,
    skills: ["تنظيم", "وساطة", "تواصل"],
  },
  {
    id: "g4",
    title: "الرد العلمي الرصين على الانحرافات الفكرية المعاصرة",
    description:
      "إنتاج مواد علمية دقيقة ترد على الطروحات الفكرية المعاصرة بأسلوب مقنع وغير صدامي.",
    category: "علمي وفكري",
    priority: Priority.high,
    skills: ["بحث شرعي", "كتابة", "ترجمة"],
  },
  {
    id: "g5",
    title: "دعم نفسي وتعليمي للمهجّرين واللاجئين",
    description:
      "مشاريع مصاحبة للعمل الإغاثي تهتم بالجانب الفكري والتعليمي والنفسي للمهجّرين، لا الماديّ فقط.",
    category: "إغاثة ورعاية",
    priority: Priority.high,
    skills: ["إرشاد نفسي", "تعليم", "تنظيم إغاثي"],
  },
  {
    id: "g6",
    title: "محتوى وقائي موجّه لأبناء الجاليات في الغرب",
    description:
      "بناء وعي بالهوية والانتماء لدى الأجيال الناشئة في بيئات مهاجرة، قبل التأثر أو الذوبان.",
    category: "تربية وهوية",
    priority: Priority.medium,
    skills: ["تربية", "محتوى", "تعليم"],
  },
  {
    id: "g7",
    title: "توثيق التجارب الإصلاحية الناجحة قبل ضياعها",
    description:
      "كثير من الخبرات تضيع بتقاعد أو انشغال أصحابها. توثيقها إرث للأجيال القادمة من العاملين.",
    category: "توثيق ومعرفة",
    priority: Priority.medium,
    skills: ["كتابة", "أرشفة", "مقابلات"],
  },
  {
    id: "g8",
    title: "بناء ثقافة معيارية مشتركة بين المصلحين",
    description:
      "حقائب تدريبية وورش تُنشئ لغة ومعايير مشتركة بين العاملين من خلفيات وجماعات مختلفة.",
    category: "بناء وتمكين",
    priority: Priority.medium,
    skills: ["تدريب", "تصميم مناهج", "تيسير"],
  },
  {
    id: "g9",
    title: "متابعة وتحديث خارطة الأولويات بحسب الواقع",
    description:
      "متابعة مستمرة لخارطة الثغور وتحديثها بحسب تغيّر الواقع، حتى لا تتجمد الأولويات.",
    category: "بحث وتخطيط",
    priority: Priority.normal,
    skills: ["تحليل", "بحث ميداني"],
  },
];

// Legacy Project.achievements/results/lessonsLearned text fields were dropped
// by migration 20260906000003_drop_legacy_project_text_fields. Completed
// seed projects now carry that same content as relational Result/Lesson
// rows, matching the shape written by app/api/projects/[id]/complete.
const INITIAL_PROJECTS: SeedProject[] = [
  {
    id: "p1",
    gapId: "g2",
    title: "سلسلة رسوم توضيحية لمفاهيم المنهج الإصلاحي",
    owner: "فريق البيان",
    country: "المغرب",
    contact: "mailto:albayan@example.com",
    summary: "إنتاج رسوم متحركة قصيرة تشرح مفاهيم الكتاب للعامة.",
    status: ProjectStatus.ACTIVE,
  },
  {
    id: "p2",
    gapId: "g2",
    title: "نشرة أسبوعية مبسّطة",
    owner: "أحمد.س",
    country: "مصر",
    contact: "mailto:ahmad@example.com",
    summary: "نشرة بريدية أسبوعية تلخص فكرة واحدة من الكتاب بلغة ميسّرة.",
    status: ProjectStatus.COMPLETED,
    results: [
      {
        id: "p2-result-achievements",
        title: "الإنجازات",
        description:
          "أُصدرت 12 نشرة أسبوعية متتالية، ووُزّعت عبر البريد الإلكتروني ومجموعات واتساب مغلقة.",
      },
      {
        id: "p2-result-outcomes",
        title: "النتائج المحققة",
        description:
          "تجاوز عدد المشتركين 900 شخص، وارتفع معدل فتح النشرة إلى 48% في الأسابيع الأخيرة.",
      },
    ],
    lessons: [
      {
        id: "p2-lesson-1",
        title: "الدروس المستفادة",
        description:
          "النشرة النصية وحدها غير كافية لجذب الشباب؛ يُنصح بمرافقتها بمقتطف صوتي قصير في النسخة القادمة. كذلك يفضَّل تثبيت موعد إصدار واحد لا يتغير لبناء عادة قراءة.",
      },
    ],
  },
  {
    id: "p3",
    gapId: "g5",
    title: "برنامج مرافقة نفسية للمهجّرين الجدد",
    owner: "جمعية سند",
    country: "تركيا",
    contact: "mailto:sanad@example.com",
    summary: "جلسات دعم نفسي جماعية أسبوعية للعائلات المهجّرة حديثًا.",
    status: ProjectStatus.ACTIVE,
  },
  {
    id: "p4",
    gapId: "g7",
    title: "أرشيف تجارب المصلحين الأوائل",
    owner: "مبادرة الذاكرة",
    country: "الأردن",
    summary: "مقابلات موثّقة مع مصلحين لهم تجارب ممتدة قبل ضياعها.",
    status: ProjectStatus.COMPLETED,
    results: [
      {
        id: "p4-result-achievements",
        title: "الإنجازات",
        description: "أُجريت 20 مقابلة موثّقة صوتيًا ونصيًا مع مصلحين من ثلاث دول.",
      },
      {
        id: "p4-result-outcomes",
        title: "النتائج المحققة",
        description: "تكوّن أرشيف من 20 ملفًا صوتيًا و20 تفريغًا نصيًا متاحًا للباحثين.",
      },
    ],
    lessons: [
      {
        id: "p4-lesson-1",
        title: "الدروس المستفادة",
        description:
          "كثير من الشخصيات ترددت في التوثيق العلني؛ إتاحة خيار النشر المؤجل أو المجهول رفع نسبة الموافقة بشكل ملحوظ.",
      },
    ],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const gap of INITIAL_GAPS) {
      await tx.gap.upsert({
        where: { id: gap.id },
        update: {
          title: gap.title,
          description: gap.description,
          category: gap.category,
          priority: gap.priority,
          skills: gap.skills,
        },
        create: gap,
      });
    }

    for (const { results, lessons, ...project } of INITIAL_PROJECTS) {
      await tx.project.upsert({
        where: { id: project.id },
        update: {
          gapId: project.gapId,
          title: project.title,
          owner: project.owner,
          country: project.country,
          contact: project.contact ?? null,
          summary: project.summary,
          status: project.status,
        },
        create: { ...project, contact: project.contact ?? null },
      });

      for (const result of results ?? []) {
        await tx.result.upsert({
          where: { id: result.id },
          update: { title: result.title, description: result.description },
          create: { ...result, projectId: project.id },
        });
      }

      for (const lesson of lessons ?? []) {
        await tx.lesson.upsert({
          where: { id: lesson.id },
          update: { title: lesson.title, description: lesson.description },
          create: { ...lesson, projectId: project.id },
        });
      }
    }
  });

  const resultCount = INITIAL_PROJECTS.reduce((n, p) => n + (p.results?.length ?? 0), 0);
  const lessonCount = INITIAL_PROJECTS.reduce((n, p) => n + (p.lessons?.length ?? 0), 0);

  console.log(
    `Seed complete: ${INITIAL_GAPS.length} gaps, ${INITIAL_PROJECTS.length} projects, ${resultCount} results, ${lessonCount} lessons (upserted, safe to re-run).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
