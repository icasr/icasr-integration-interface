var _ = require('lodash');
var expect = require('chai').expect;
var mlog = require('mocha-logger');
var spawn = require('child_process').spawn;
var reflib = require('reflib');

var inputFile = 'test/data/nodupes.json';
var outputFile = '/tmp/output.json';

describe('Test filter App via CLI', function() {
	this.timeout(60 * 1000); // 60s

	var inputRefs;
	before('parse input references', done => {
		reflib.parseFile(inputFile, (err, refs) => {
			if (err) return done(err);
			inputRefs = refs;
			done();
		});
	});

	var runner;
	before('setup up runner', ()=> {
		runner = args => new Promise((resolve, reject) => {
			var ps = spawn('node', args);
			ps.stdout.on('data', msg => _.isBuffer(msg) && mlog.log(msg.toString().replace(/\n$/, '')));
			ps.stderr.on('data', msg => _.isBuffer(msg) && mlog.log(msg.toString().replace(/\n$/, '')));
			ps.on('exit', code => {
				if (code == 0) { resolve() } else { reject(`Unknown exit code: ${code}`) }
			});
		});
	});

	it('should launch the process and pass through data unedited', ()=>
		runner([
			'../cli/app.js',
			'-vvv',
			'--action=../apps/filter',
			`--input=${inputFile}`,
			`--output=${outputFile}`,
			'--setting=merge.enabled=false', // Since its just a copy we can avoid the overhead of merging
		])
			.then(()=> reflib.parseFile(outputFile, (err, outputRefs) => {
				if (err) return Promise.reject(err);
				expect(inputRefs).to.deep.equal(outputRefs);
			}))
	);

	it('should launch the process and accept back filtered data', ()=>
		runner([
			'../cli/app.js',
			'-vvv',
			'--action=../apps/filter',
			'--setting=fields=title,year',
			`--input=${inputFile}`,
			`--output=${outputFile}`,
			'--setting=merge.enabled=false', // Since its just a copy we can avoid the overhead of merging
		])
			.then(()=> reflib.parseFile(outputFile, (err, outputRefs) => {
				if (err) return Promise.reject(err);
				expect(outputRefs).to.have.length(inputRefs.length);
				expect(inputRefs
					.map(ref => Object.assign(
						_.pick(ref, ['title', 'year']),
						{type: 'report'}, // The fallback type for JSON data
					))
				).to.deep.equal(outputRefs);
			}))
	);

	it('should launch the process and merge back filtered data', ()=>
		runner([
			'../cli/app.js',
			'-vvv',
			'--action=../apps/filter',
			'--setting=fields=title,year',
			`--input=${inputFile}`,
			`--output=${outputFile}`,
		])
			.then(()=> reflib.parseFile(outputFile, (err, outputRefs) => {
				if (err) return Promise.reject(err);
				expect(inputRefs).to.deep.equal(outputRefs);
			}))
	);

});