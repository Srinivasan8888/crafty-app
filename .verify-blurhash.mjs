import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const c = await prisma.crafter.findFirst({ where:{ slug:'verify-test-crafter' }, select:{ profile_photo_blurhash:true, portfolio_blurhashes:true }});
const len = c?.profile_photo_blurhash?.length ?? 0;
console.log('profile_photo_blurhash length =', len, '(old cap was 500, new cap 4000)');
console.log('exceeds old 500 cap?', len > 500);
console.log('within new 4000 cap?', len <= 4000);
await prisma.$disconnect();
