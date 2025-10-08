import logging

# Create a logger
logger = logging.getLogger("pidentify")

# Set the minimum logging level to INFO
logger.setLevel(logging.INFO)

# Create a console handler that outputs to the console
console_handler = logging.StreamHandler()

# Set the logging level for the handler to INFO
console_handler.setLevel(logging.INFO)

# Create a logging format
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)

# Add the console handler to the logger
logger.addHandler(console_handler)
