export interface Example {
  id: string;
  name: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'countdown',
    name: 'Countdown',
    source: `algS
  int n 5
  while n > 0 do
    wr n
    set n n - 1
  wr 'Liftoff!'
algE`,
  },
  {
    id: 'fizzbuzz',
    name: 'FizzBuzz',
    source: `algS
  int i 1
  while i <= 15 do
    if i % 15 = 0 then
      wr 'FizzBuzz'
    else
      if i % 3 = 0 then
        wr 'Fizz'
      else
        if i % 5 = 0 then
          wr 'Buzz'
        else
          wr i
    set i i + 1
algE`,
  },
  {
    id: 'gcd',
    name: 'Euclid',
    source: `# The greatest common divisor, the way Euclid found it 2300 years ago.
algS
  int a 84
  int b 36
  int r 0
  while b != 0 do
    set r a % b
    set a b
    set b r
  wr 'GCD is ' + a
algE`,
  },
  {
    id: 'collatz',
    name: 'Collatz',
    source: `# Halve it if even, else triple it and add one. Does it always reach 1?
algS
  int n 27
  int steps 0
  while n != 1 do
    if n % 2 = 0 then
      set n n / 2
    else
      set n 3 * n + 1
    set steps steps + 1
  wr 'Reached 1 after ' + steps + ' steps'
algE`,
  },
  {
    id: 'example1',
    name: '2016: Hello',
    source: `algS 
	str var 'Hello_world!'
	wr var
algE `,
  },
  {
    id: 'example2',
    name: '2016: Branch',
    source: `algS
	int a 13

	if op a > 12 then 
		op a * 5 
	else 
		op a - 2 

	wr a
algE`,
  },
];
