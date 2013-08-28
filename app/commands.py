import subprocess, threading, os, time
from config import BASE_DIR

# Base unit of tool execution is a command.
class Command(object):
    # Initialize command
    def __init__(self, cmd, tool, action, path, current_file, uuid, args):
        self.uuid = uuid
        self.cmd = cmd
        self.process = None
        self.tool = tool
        self.action = action
        self.path = path
        self.current_file = current_file
        self.output_file = ''
        self.run_time = time.time()
        self.args = args.strip()
        self.done = False

    # Begin command in another thread.
    def run(self):
        def target():
            self.run_time = time.time()
            # Worker thread for code execution of run tool
            print 'Thread started'
            # Get file path for communication results, stdin, etc. to
            # further requests (without redis caching)
            base_file_path = BASE_DIR + 'results/' + self.uuid
            self.output_file = open(base_file_path, 'a')
            self.output_file.write('')
            # Check which tool / action pair is being used, process accordingly.
            if self.tool.lower() == 'k':
                has_file_arg = self.args and (self.args[0] != '-')
                # Use our guess on whether a file arg is present to decide how to display executed command to user
                add_string = (' ' + self.current_file) if (self.args and len(self.args.strip())) else self.current_file
                if has_file_arg:
                    add_string = ''
                if self.action.lower() == 'kompile':
                    if not '.k' in self.current_file:
                        self.output_file.write('Invalid file type!  File must end in .k to be kompiled!\n')
                    else:
                        self.output_file.write('Running command: kompile ' + ' '.join(self.args.split()) + add_string + '\n')
                        self.output_file.flush()
                        self.process = subprocess.Popen(['/k/bin/kompile'] + self.args.split() + [self.current_file], stdout=self.output_file, stderr = self.output_file, stdin=subprocess.PIPE, shell=False, cwd = self.path)
                        open(base_file_path + '.in', 'w').write(str(self.process.stdin.fileno()))
                        self.process.wait()
                        empty = (len(open(base_file_path).read().strip().splitlines()) == 1)
                        self.output_file.write('----- End of process output')
                        if empty:
                            self.output_file.write(' (no output indicates a successful kompile)')
                        self.output_file.write('.\n')
                elif self.action.lower() == 'krun':
                    self.output_file.write('Running command: krun ' + ' '.join(self.args.split()) + add_string + '\n')
                    self.output_file.flush()
                    self.process = subprocess.Popen(['/k/bin/krun'] + self.args.split() + [self.current_file], stdout=self.output_file, stderr = self.output_file, stdin=subprocess.PIPE, shell=False, cwd = self.path)
                    open(base_file_path + '.in', 'w').write(str(self.process.stdin.fileno()))
                    self.process.wait()
                    self.output_file.write('----- End of process output.\n')
                elif self.action.lower() == 'krun-help':
                    self.output_file.write('Running command: krun --help\n')
                    self.output_file.flush()
                    self.process = subprocess.Popen(['/k/bin/krun', '--help'], stdout=self.output_file, stderr = subprocess.PIPE, stdin=subprocess.PIPE, shell=False)
                    open(base_file_path + '.in', 'w').write(str(self.process.stdin.fileno()))
                    self.process.wait()
                elif self.action.lower() == 'kompile-help':
                    self.output_file.write('Running command: kompile --help\n')
                    self.output_file.flush()
                    self.process = subprocess.Popen(['/k/bin/kompile', '--help'], stdout=self.output_file, stderr = subprocess.PIPE, stdin=subprocess.PIPE, shell=False)
                    open(base_file_path + '.in', 'w').write(str(self.process.stdin.fileno()))
                    self.process.wait()
            # Clean up after process
            self.done = True
            done_file = open(base_file_path + '.done', 'w')
            done_file.write('')
            done_file.close()
            self.output_file.close()
            print 'Thread finished.'

        # Supervisor thread to kill process after sixty seconds
        # of execution with no exit.
        def supervise(thread):
            thread.join(timeout = 60)
            if self.process and not self.done:
                try:
                    print 'Reaping process'
                    self.output_file.write('Error: Process timed out, job exceeded 60 seconds.\n')
                    self.process.terminate()
                except:
                    # This means there was no process, do nothing.
                    pass

        # Start threads using locally defined methods above
        thread = threading.Thread(target = target)
        supervisor_thread = threading.Thread(target = supervise, args = [thread])
        thread.start()
        supervisor_thread.start()