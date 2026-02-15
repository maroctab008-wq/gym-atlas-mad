const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertBelow1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t] + '-' + units[10 + u];
    }
    if (u === 0) return tens[t] + (t === 8 ? 's' : '');
    if (u === 1 && t !== 8) return tens[t] + ' et un';
    return tens[t] + '-' + units[u];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let result = h === 1 ? 'cent' : units[h] + ' cent';
  if (rest === 0 && h > 1) result += 's';
  if (rest > 0) result += ' ' + convertBelow1000(rest);
  return result;
}

export function numberToWordsFR(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numberToWordsFR(-n);

  const integer = Math.floor(n);
  let result = '';

  if (integer >= 1000000) {
    const millions = Math.floor(integer / 1000000);
    result += (millions === 1 ? 'un million' : convertBelow1000(millions) + ' millions');
    const rest = integer % 1000000;
    if (rest > 0) result += ' ' + numberToWordsFR(rest);
    return result;
  }

  if (integer >= 1000) {
    const thousands = Math.floor(integer / 1000);
    result += (thousands === 1 ? 'mille' : convertBelow1000(thousands) + ' mille');
    const rest = integer % 1000;
    if (rest > 0) result += ' ' + convertBelow1000(rest);
    return result;
  }

  return convertBelow1000(integer);
}
